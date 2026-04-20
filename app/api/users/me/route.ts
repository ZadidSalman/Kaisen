import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/lib/models'
import { proxy } from '@/proxy'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    }

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        totalRatings: user.totalRatings,
        totalFollowers: user.totalFollowers,
        totalFollowing: user.totalFollowing,
        anilist: user.anilist ? {
          userId: user.anilist.userId,
          username: user.anilist.username,
        } : null,
      }
    })
  } catch (err) {
    console.error('[API] GET /api/users/me:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    await connectDB()
    const payload = proxy(req)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Unauthorized', code: 401 }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateSchema.parse(body)

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { $set: validated },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found', code: 404 }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        totalRatings: user.totalRatings,
        totalFollowers: user.totalFollowers,
        totalFollowing: user.totalFollowing,
        anilist: user.anilist ? {
          userId: user.anilist.userId,
          username: user.anilist.username,
        } : null,
      }
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: err.issues[0].message }, { status: 400 })
    }
    console.error('[API] PATCH /api/users/me:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
