export type RoomStatus = 'waiting' | 'in_progress' | 'ended'
export type RoomType = 'party' | 'duel'
export type GamePhase = 'lobby' | 'game' | 'reveal' | 'results'

export interface Player {
  userId: string
  username: string
  avatar: string | null
  totalScore: number
  ready: boolean
}

export interface RoundAnswer {
  userId: string
  submittedAnswer: string
  correct: boolean
  secondsRemaining: number
  baseScore: number
  bonusScore: number
  totalScoreGained: number
  autoLocked: boolean
}

export interface RevealTheme {
  animeTitle: string | null
  animeTitleEnglish: string | null
  coverImage: string | null
  malId: number | null
  themeType: string | null
  themeSequence: number | null
  songTitle: string | null
  artistName: string | null
}

export interface RoundReveal {
  correctAnswer: string
  answers: RoundAnswer[]
  theme: RevealTheme
  players: Player[]
  gameOver: boolean
}

export interface RoomSettings {
  poolMode: 'random' | 'watched' | 'common'
  guessType: string
  roundCount: number
  maxPlayers: number
  timeLimitSeconds: number
}

export interface QuizRoomData {
  _id: string
  roomCode: string
  roomType: RoomType
  status: RoomStatus
  hostId: string | null
  currentRound: number
  players: Player[]
  settings: RoomSettings
  rounds: any[]
}

export interface RankUpdateData {
  userId: string
  rpBefore: number
  rpAfter: number
  rpChange: number
  streakBonus: number
  tierBefore: string
  tierAfter: string
  promoted: boolean
  demoted: boolean
  newStreak: number
}
