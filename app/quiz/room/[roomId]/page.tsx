import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db'
import { QuizRoom } from '@/lib/models'
import QuizRoomClient from './QuizRoomClient'

export const dynamic = 'force-dynamic'

export default async function QuizRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  const session = await getSession()
  
  if (!session || !session.user) {
    redirect('/login')
  }

  await dbConnect()

  let room;
  try {
    room = await QuizRoom.findById(roomId)
  } catch (error) {
    console.error('Error loading quiz room:', error)
    redirect('/quiz/multiplayer?error=invalid_room')
  }
  
  if (!room) {
    redirect('/quiz/multiplayer?error=room_not_found')
  }

  const isPlayer = room.players.some((p: any) => p.userId === session.user.id)
  if (!isPlayer) {
    redirect('/quiz/multiplayer?error=not_in_room')
  }

  const initialRoom = JSON.parse(JSON.stringify(room))

  return <QuizRoomClient initialRoom={initialRoom} />
}
