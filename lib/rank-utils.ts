import { QuizRoom, UserRank, RankHistory } from '@/lib/models'
import { pusherServer } from '@/lib/pusher-server'

const pendingRpRuns = new Set<string>()

export type RankTier = 'academy' | 'genin' | 'chunin' | 'jonin' | 'anbu' | 'kage'

export const TIERS = [
  { tier: 'academy', min: 0,    max: 399,  floor: 0,    divisions: null },
  { tier: 'genin',   min: 400,  max: 799,  floor: 400,  divisions: 3 },
  { tier: 'chunin',  min: 800,  max: 1399, floor: 800,  divisions: 3 },
  { tier: 'jonin',   min: 1400, max: 2199, floor: 1400, divisions: 3 },
  { tier: 'anbu',    min: 2200, max: 3199, floor: 2200, divisions: 2 },
  { tier: 'kage',    min: 3200, max: Infinity, floor: 3200, divisions: null },
]

export function getTierFromRP(rp: number) {
  const t = TIERS.find(t => rp >= t.min && rp <= t.max)!
  let division: number | null = null

  if (t.divisions) {
    const range = t.max - t.min
    const posInTier = rp - t.min
    // Division III = bottom, Division I = top
    division = t.divisions - Math.floor((posInTier / range) * t.divisions)
    division = Math.max(1, Math.min(t.divisions, division))
  }

  return { tier: t.tier as RankTier, division, newFloor: t.floor }
}

export function getBaseRP(placement: number, totalPlayers: number, roomType: 'party' | 'duel'): number {
  if (roomType === 'duel') {
    if (placement === 1) return 20 // WIN
    if (placement === 2 && totalPlayers === 2) return -15 // LOSS
    return 5 // DRAW fallback
  }

  // Party mode
  if (placement === 1) return 20
  if (placement === 2) return 10
  if (placement === 3) return 0
  if (placement === 4) return -5
  if (placement === 5) return -10
  if (placement >= 6) return -15
  
  return -15
}

export function getStreakBonus(winStreak: number): number {
  if (winStreak <= 1) return 0
  if (winStreak === 2) return 5
  if (winStreak === 3) return 10
  if (winStreak === 4) return 15
  return 20 // 5+ wins
}

function getTierIndex(tier: string) {
  return TIERS.findIndex(t => t.tier === tier)
}

export async function getUserRank(userId: string) {
  let userRank = await UserRank.findOne({ userId })
  if (!userRank) {
    userRank = await UserRank.create({ userId })
  }
  return userRank
}

export async function calculateAndApplyRP(roomId: string) {
  const room = await QuizRoom.findById(roomId)
  if (!room) return
  if (room.roomType !== 'party' && room.roomType !== 'duel') return

  // Sort players by final score descending
  const ranked = [...room.players].sort((a, b) => b.totalScore - a.totalScore)
  
  const results = []

  for (let i = 0; i < ranked.length; i++) {
    const player = ranked[i]
    let placement = i + 1
    const totalPlayers = ranked.length

    // Handle ties for placement
    if (i > 0 && player.totalScore === ranked[i - 1].totalScore) {
      placement = results[i - 1].placement
    }

    const userRank = await getUserRank(player.userId)
    const rpBefore = userRank.rp
    const tierBefore = userRank.tier

    const baseRP = getBaseRP(placement, totalPlayers, room.roomType as 'party' | 'duel')
    
    const isWin = placement === 1
    const newStreak = isWin ? userRank.currentWinStreak + 1 : 0
    const streakBonus = isWin ? getStreakBonus(newStreak) : 0
    
    const rpChange = baseRP + streakBonus

    const rpAfterRaw = rpBefore + rpChange
    const rpAfter = Math.max(userRank.tierFloor, rpAfterRaw)

    const { tier: newTier, division: newDivision, newFloor } = getTierFromRP(rpAfter)
    const promoted = getTierIndex(newTier) > getTierIndex(tierBefore)
    const demoted = getTierIndex(newTier) < getTierIndex(tierBefore)

    userRank.rp = rpAfter
    userRank.tier = newTier
    userRank.division = newDivision
    userRank.tierFloor = promoted ? newFloor : userRank.tierFloor
    userRank.currentWinStreak = newStreak
    userRank.longestWinStreak = Math.max(userRank.longestWinStreak, newStreak)
    userRank.stats.totalGames += 1
    if (isWin) userRank.stats.wins += 1
    if (!isWin && baseRP < 0) userRank.stats.losses += 1
    if (!isWin && baseRP >= 0) userRank.stats.draws += 1
    userRank.stats.winRate = userRank.stats.wins / userRank.stats.totalGames
    userRank.stats.peakRP = Math.max(userRank.stats.peakRP, rpAfter)
    if (getTierIndex(newTier) > getTierIndex(userRank.stats.peakTier)) {
      userRank.stats.peakTier = newTier
    }
    userRank.season.seasonRP += Math.max(0, rpChange)
    if (isWin) userRank.season.seasonWins += 1
    else if (baseRP < 0) userRank.season.seasonLosses += 1

    await userRank.save()

    const actualRpChange = rpAfter - rpBefore

    await RankHistory.create({
      userId: player.userId,
      roomId,
      roomType: room.roomType,
      playedAt: new Date(),
      placement,
      totalPlayers,
      rpBefore,
      rpAfter,
      rpChange: actualRpChange,
      streakBonus,
      winStreakAtTime: newStreak,
      tierBefore: tierBefore,
      tierAfter: newTier,
      promoted,
      demoted,
    })

    results.push({
      userId: player.userId,
      rpBefore,
      rpAfter,
      rpChange: actualRpChange,
      streakBonus,
      tierBefore: tierBefore,
      tierAfter: newTier,
      promoted,
      demoted,
      newStreak,
      placement
    })

    await pusherServer.trigger(`presence-quiz-room-${roomId}`, 'room:rank-updated', {
      userId: player.userId,
      rpBefore,
      rpAfter,
      rpChange: actualRpChange,
      streakBonus,
      tierBefore: tierBefore,
      tierAfter: newTier,
      promoted,
      demoted,
      newStreak,
    })
  }

  await invalidateLeaderboardCache()
}

export function scheduleRPUpdate(roomId: string) {
  if (pendingRpRuns.has(roomId)) return
  pendingRpRuns.add(roomId)

  setTimeout(async () => {
    try {
      await calculateAndApplyRP(roomId)
    } catch (error) {
      console.error('Failed to calculate RP in background:', error)
    } finally {
      pendingRpRuns.delete(roomId)
    }
  }, 0)
}

export async function invalidateLeaderboardCache() {
  console.log('Leaderboard cache invalidated')
}
