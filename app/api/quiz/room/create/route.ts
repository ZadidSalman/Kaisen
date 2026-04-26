import { NextRequest, NextResponse } from 'next/server'
import { setTokenCookie } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, WatchHistory, User } from '@/lib/models'
import { proxy } from '@/proxy'

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const payload = await proxy(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Lazy cleanup of empty rooms
    const { cleanupAllEmptyRooms } = await import('@/lib/quiz-room-cleanup')
    await cleanupAllEmptyRooms()

    const body = await req.json()
    const { roomType, poolMode, guessType, roundCount, maxPlayers, matchmaking } = body

    if (!roomType || !poolMode || !guessType || !roundCount || !matchmaking) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const hostId = payload.userId

    let watchedPoolAnimeIds: string[] = []
    if (poolMode === 'watched') {
      const history = await WatchHistory.find({ userId: payload.userId }).select('themeId')
      if (history.length === 0) {
        return NextResponse.json({ error: 'No watched history found' }, { status: 400 })
      }
      
      const ThemeCache = (await import('@/lib/models')).ThemeCache
      const themeIds = history.map(h => h.themeId)
      const themes = await ThemeCache.find({ _id: { $in: themeIds } }).select('anilistId')
      watchedPoolAnimeIds = themes.filter(t => t.anilistId).map(t => String(t.anilistId))
    }

    let roomCode = generateRoomCode()
    let isUnique = false
    while (!isUnique) {
      const existing = await QuizRoom.findOne({ roomCode })
      if (!existing) {
        isUnique = true
      } else {
        roomCode = generateRoomCode()
      }
    }

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newRoom = new QuizRoom({
      roomCode,
      roomType,
      hostId,
      settings: {
        poolMode,
        watchedPoolAnimeIds,
        guessType,
        roundCount,
        maxPlayers: roomType === 'duel' ? 2 : (maxPlayers || 6),
        timeLimitSeconds: 30
      },
      status: 'waiting',
      matchmaking,
      players: [{
        userId: payload.userId,
        username: user.username,
        avatar: user.avatarUrl,
        totalScore: 0,
        ready: false,
        joinedAt: new Date()
      }]
    })

    await newRoom.save()

    const response = NextResponse.json({ success: true, roomId: newRoom._id, roomCode: newRoom.roomCode })

    if (payload._token) {
      setTokenCookie(response, payload._token)
    }

    return response

  } catch (error) {
    console.error('Quiz room create error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
