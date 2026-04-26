import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom, WatchHistory, User } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

export const dynamic = 'force-dynamic'

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
    const session = await getSession()
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    
    // Lazy cleanup of empty rooms
    const { cleanupAllEmptyRooms } = await import('@/lib/quiz-room-cleanup')
    await cleanupAllEmptyRooms()

    const body = await req.json()
    const { roomType, poolMode, guessType, maxPlayers = 6 } = body

    if (!roomType || !poolMode || !guessType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Attempt to find an existing public room
    // Criteria: waiting, public, matching settings, not full
    const existingRoom = await QuizRoom.findOne({
      status: 'waiting',
      matchmaking: 'public',
      roomType,
      'settings.poolMode': poolMode,
      'settings.guessType': guessType,
      $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] }
    })

    if (existingRoom) {
      const isAlreadyInRoom = existingRoom.players.some((p: any) => p.userId === session.user.id)
      
      if (!isAlreadyInRoom) {
        existingRoom.players.push({
          userId: session.user.id,
          username: user.username,
          avatar: user.avatarUrl,
          totalScore: 0,
          ready: false,
          joinedAt: new Date()
        })

        // If room was empty or host left previously, assign this joiner as host
        if (existingRoom.players.length === 1) {
          existingRoom.hostId = session.user.id
        }

        await existingRoom.save()

        await pusherServer.trigger(`presence-quiz-room-${existingRoom._id}`, 'room:player-joined', {
          userId: session.user.id,
          username: user.username,
          avatar: user.avatarUrl,
          playerCount: existingRoom.players.length,
          players: existingRoom.players
        })
      }

      return NextResponse.json({ success: true, roomId: existingRoom._id, roomCode: existingRoom.roomCode })
    }

    // No existing room found, create a new one
    const hostId = roomType === 'party' ? session.user.id : null

    let watchedPoolAnimeIds: string[] = []
    if (poolMode === 'watched') {
      const history = await WatchHistory.find({ userId: session.user.id }).select('themeId')
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

    const newRoom = new QuizRoom({
      roomCode,
      roomType,
      hostId,
      settings: {
        poolMode,
        watchedPoolAnimeIds,
        guessType,
        roundCount: 10, // Default for public
        maxPlayers: roomType === 'duel' ? 2 : maxPlayers,
        timeLimitSeconds: 30
      },
      status: 'waiting',
      matchmaking: 'public',
      players: [{
        userId: session.user.id,
        username: user.username,
        avatar: user.avatarUrl,
        totalScore: 0,
        ready: false,
        joinedAt: new Date()
      }]
    })

    await newRoom.save()

    return NextResponse.json({ success: true, roomId: newRoom._id, roomCode: newRoom.roomCode })

  } catch (error) {
    console.error('Quiz room public matchmaking error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
