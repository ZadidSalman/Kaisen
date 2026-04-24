
import { connectDB } from './lib/db'
import { User, Follow, WatchHistory, Rating } from './lib/models'
import mongoose from 'mongoose'

async function test() {
  try {
    await connectDB()
    console.log('Connected to DB')
    
    // Find a user to test with
    const user = await User.findOne()
    if (!user) {
      console.log('No users found')
      return
    }
    const userId = user._id
    console.log('Testing with userId:', userId)

    const following = await Follow.find({ followerId: userId }).lean()
    let followedIds = following.map(f => f.followeeId)
    console.log('Followed IDs:', followedIds)

    const isGlobalFallback = followedIds.length === 0
    const queryFilter = isGlobalFallback 
      ? { userId: { $ne: userId } } 
      : { userId: { $in: followedIds } }

    console.log('Query filter:', JSON.stringify(queryFilter))

    const [history, ratings] = await Promise.all([
      WatchHistory.find(queryFilter)
        .sort({ viewedAt: -1 })
        .limit(10)
        .populate('userId', 'username displayName avatarUrl')
        .populate('themeId', 'slug songTitle')
        .lean(),
      Rating.find(queryFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'username displayName avatarUrl')
        .populate('themeId', 'slug songTitle')
        .lean(),
    ])

    console.log('History count:', history.length)
    console.log('Ratings count:', ratings.length)

    const activities = [
      ...history.map((h: any) => ({
        id: h._id?.toString(),
        user: {
          username: h.userId?.username || 'unknown',
          displayName: h.userId?.displayName || 'Unknown User',
          avatar: h.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${h.userId?.username || 'guest'}`,
        },
        type: 'listening',
        item: {
          title: h.themeId?.songTitle || 'Unknown Title',
          slug: h.themeId?.slug || h.themeSlug,
        },
        timestamp: h.viewedAt,
      })),
      ...ratings.map((r: any) => ({
        id: r._id?.toString(),
        user: {
          username: r.userId?.username || 'unknown',
          displayName: r.userId?.displayName || 'Unknown User',
          avatar: r.userId?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.userId?.username || 'guest'}`,
        },
        type: 'liked',
        item: {
          title: r.themeId?.songTitle || 'Unknown Title',
          slug: r.themeId?.slug || r.themeSlug,
        },
        timestamp: r.createdAt,
      })),
    ]
    .filter(a => a.user.username !== 'unknown')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 3)

    console.log('Activities:', JSON.stringify(activities, null, 2))
    
    process.exit(0)
  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  }
}

test()
