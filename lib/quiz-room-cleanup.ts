import { QuizRoom } from './models'
import { pusherServer } from './pusher-server'

async function safeTrigger(channel: string, event: string, payload: Record<string, unknown>) {
  try {
    await pusherServer.trigger(channel, event, payload)
  } catch (error) {
    console.error(`[QuizRoomCleanup] Failed to trigger ${event}:`, error)
  }
}

export async function cleanupRoom(room: any) {
  const now = new Date()
  const HEARTBEAT_THRESHOLD = 45 * 1000 // 45 seconds
  const EMPTY_ROOM_THRESHOLD = 60 * 1000 // 60 seconds

  let changed = false
  const disconnectedPlayerIds: string[] = []

  // 1. Identify and remove timed-out players
  const activePlayers = room.players.filter((player: any) => {
    const lastSeen = new Date(player.lastSeenAt).getTime()
    const isTimedOut = (now.getTime() - lastSeen) > HEARTBEAT_THRESHOLD
    
    if (isTimedOut) {
      disconnectedPlayerIds.push(player.userId)
      changed = true
      return false
    }
    return true
  })

  if (changed) {
    room.players = activePlayers

    // 2. Handle Host reassignment
    const currentHostId = room.hostId?.toString()
    if (disconnectedPlayerIds.includes(currentHostId)) {
      if (room.players.length > 0) {
        // Assign a random player as the new host
        const randomIndex = Math.floor(Math.random() * room.players.length)
        room.hostId = room.players[randomIndex].userId
      } else {
        // Room is empty, hostId will be reassigned to the next joiner
        // Only end the room if it was already in progress
        if (room.status !== 'waiting') {
          room.status = 'ended'
        }
      }
    }

    // 3. Notify remaining players about disconnected users
    for (const userId of disconnectedPlayerIds) {
      await safeTrigger(`presence-quiz-room-${room._id}`, 'room:player-left', {
        userId,
        newHostId: room.hostId,
        roomStatus: room.status,
        reason: 'disconnect'
      })
    }
  }

  // 4. Handle Empty Room Tracking
  if (room.players.length === 0) {
    if (!room.emptySince) {
      room.emptySince = now
      changed = true
    } else {
      // Check if it has been empty for too long
      const emptyTime = now.getTime() - new Date(room.emptySince).getTime()
      if (emptyTime > EMPTY_ROOM_THRESHOLD) {
        await QuizRoom.findByIdAndDelete(room._id)
        await safeTrigger(`presence-quiz-room-${room._id}`, 'room:closed', {
          reason: 'inactivity'
        })
        return null // Room is gone
      }
    }
  } else if (room.emptySince) {
    room.emptySince = null
    changed = true
  }

  if (changed) {
    await room.save()
  }

  return room
}

export async function cleanupAllEmptyRooms() {
  const now = new Date()
  const EMPTY_ROOM_THRESHOLD = 60 * 1000

  // 1. Find rooms that have no players
  const emptyRooms = await QuizRoom.find({ 
    $or: [
      { players: { $size: 0 } },
      { players: { $exists: false } }
    ]
  })

  for (const room of emptyRooms) {
    if (!room.emptySince) {
      room.emptySince = now
      await room.save()
    } else {
      const emptyTime = now.getTime() - new Date(room.emptySince).getTime()
      if (emptyTime > EMPTY_ROOM_THRESHOLD) {
        await QuizRoom.findByIdAndDelete(room._id)
        await safeTrigger(`presence-quiz-room-${room._id}`, 'room:closed', {
          reason: 'inactivity'
        })
      }
    }
  }
}
