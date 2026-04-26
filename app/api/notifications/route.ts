import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Notification, User } from '@/lib/models'
import { proxy } from '@/proxy'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(request)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const notifications = await Notification.find({ recipientId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actorId', 'username displayName avatarUrl')
      .lean()

    return NextResponse.json({
      success: true,
      data: notifications
    })
  } catch (error: any) {
    console.error('Fetch notifications error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const payload = await proxy(request)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationIds } = await request.json()

    if (notificationIds && Array.isArray(notificationIds)) {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipientId: payload.userId },
        { $set: { read: true } }
      )
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipientId: payload.userId, read: false },
        { $set: { read: true } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Mark read error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
