'use client'
import { motion } from 'motion/react'
import { Crown, Check, Clock, Lock } from 'lucide-react'
import Image from 'next/image'
import { Player, RoundAnswer, RoundReveal, RankUpdateData } from './quiz-room-types'
import { getFallbackAvatar } from '@/lib/utils'

export function LiveScoreboard({ players, myUserId, roundAnswers }: {
  players: Player[]
  myUserId: string
  roundAnswers: RoundAnswer[]
}) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  return (
    <div className="w-full space-y-2">
      {sorted.map((p, i) => {
        const ans = roundAnswers.find(a => a.userId === p.userId)
        const isMe = p.userId === myUserId
        return (
          <motion.div key={p.userId} layout
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl ${isMe ? 'bg-accent/10 border border-accent/20' : 'bg-white/60'}`}>
            <span className="w-5 text-xs font-bold text-ktext-tertiary">#{i + 1}</span>
            <div className="w-8 h-8 rounded-full overflow-hidden relative shrink-0">
              <Image src={p.avatar ?? getFallbackAvatar(p.username)} fill className="object-cover" alt={p.username} />
            </div>
            <span className="flex-1 text-sm font-display font-bold truncate">{p.username}</span>
            {ans && (
              <span className="text-xs">
                {ans.autoLocked ? '🔒' : ans.correct ? '✅' : '❌'}
              </span>
            )}
            <span className={`text-sm font-mono font-bold ${p.totalScore < 0 ? 'text-red-500' : 'text-accent'}`}>
              {p.totalScore >= 0 ? '+' : ''}{p.totalScore}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

export function RevealView({ reveal, myUserId, onNext, isHost, isLastRound, currentRound, totalRounds }: {
  reveal: RoundReveal
  myUserId: string
  onNext: () => void
  isHost: boolean
  isLastRound: boolean
  currentRound: number
  totalRounds: number
}) {
  const myAnswer = reveal.answers.find(a => a.userId === myUserId)
  const title = reveal.theme.animeTitleEnglish || reveal.theme.animeTitle || 'Unknown'
  const themeLabel = reveal.theme.themeType
    ? `${reveal.theme.themeType}${reveal.theme.themeSequence ?? ''}`
    : null

  return (
    <div className="flex flex-col items-center px-6 pb-10 pt-4 gap-6">
      <p className="text-xs font-display font-bold text-ktext-tertiary uppercase tracking-widest">Round {currentRound} / {totalRounds} — Reveal</p>

      {reveal.theme.coverImage && (
        <div className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-xl">
          <Image src={reveal.theme.coverImage} fill className="object-cover" alt={title} />
        </div>
      )}

      <div className="text-center">
        <p className="text-2xl font-display font-black text-accent">{title}</p>
        {themeLabel && <p className="text-sm text-ktext-tertiary mt-1">{themeLabel} — {reveal.theme.songTitle}</p>}
        {reveal.theme.artistName && <p className="text-xs text-ktext-tertiary">{reveal.theme.artistName}</p>}
      </div>

      <div className="w-full bg-white rounded-3xl p-4 shadow-sm">
        <p className="text-xs font-bold text-ktext-tertiary mb-1">Correct Answer</p>
        <p className="font-display font-bold text-accent">{reveal.correctAnswer}</p>
      </div>

      {myAnswer && (
        <div className={`w-full rounded-3xl p-4 ${myAnswer.autoLocked ? 'bg-gray-50' : myAnswer.correct ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs font-bold text-ktext-tertiary mb-1">Your Result</p>
          <div className="flex items-center justify-between">
            <span className="font-display font-bold">
              {myAnswer.autoLocked ? '🔒 Auto-locked' : myAnswer.correct ? '✅ Correct' : `❌ ${myAnswer.submittedAnswer || 'No answer'}`}
            </span>
            <span className={`text-lg font-mono font-black ${myAnswer.totalScoreGained > 0 ? 'text-green-600' : myAnswer.totalScoreGained < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {myAnswer.totalScoreGained > 0 ? '+' : ''}{myAnswer.totalScoreGained}
            </span>
          </div>
          {myAnswer.bonusScore > 0 && (
            <p className="text-xs text-green-600 mt-1">⚡ First answer bonus: +{myAnswer.bonusScore}</p>
          )}
        </div>
      )}

      <LiveScoreboard players={reveal.players} myUserId={myUserId} roundAnswers={reveal.answers} />

      {isHost && !reveal.gameOver && (
        <motion.button whileTap={{ scale: 0.97 }} onClick={onNext}
          className="w-full py-4 bg-accent text-white rounded-full font-display font-bold shadow-lg">
          Next Round →
        </motion.button>
      )}
      {!isHost && !reveal.gameOver && (
        <p className="text-sm text-ktext-tertiary">Waiting for host to start next round…</p>
      )}
    </div>
  )
}

export function ResultsView({ players, myUserId, onLeave, rankUpdate }: {
  players: Player[]
  myUserId: string
  onLeave: () => void
  rankUpdate?: RankUpdateData | null
}) {
  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore)
  const winner = sorted[0]
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-col items-center px-6 pb-10 pt-8 gap-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
        className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center">
        <Crown className="w-12 h-12 text-accent" />
      </motion.div>

      <div className="text-center">
        <p className="text-xs font-bold text-ktext-tertiary uppercase tracking-widest mb-1">Game Over</p>
        <p className="text-3xl font-display font-black text-accent">{winner?.username} wins!</p>
      </div>

      {rankUpdate && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-full bg-white rounded-3xl p-5 shadow-sm border border-pink-100 flex flex-col items-center gap-2">
          <p className="text-xs font-bold text-ktext-tertiary uppercase tracking-widest">Rank Update</p>
          <div className="flex items-center gap-4 w-full justify-center">
            <div className="text-center">
              <p className="font-display font-black text-lg capitalize">{rankUpdate.tierBefore}</p>
              <p className="text-sm font-mono text-gray-500">{rankUpdate.rpBefore} RP</p>
            </div>
            <div className="flex flex-col items-center">
              <span className={`text-xl font-black ${rankUpdate.rpChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {rankUpdate.rpChange >= 0 ? '+' : ''}{rankUpdate.rpChange}
              </span>
              {rankUpdate.streakBonus > 0 && <span className="text-[10px] text-orange-500 font-bold bg-orange-100 px-2 py-0.5 rounded-full mt-1">Streak +{rankUpdate.streakBonus}</span>}
            </div>
            <div className="text-center">
              <p className="font-display font-black text-lg capitalize text-accent">{rankUpdate.tierAfter}</p>
              <p className="text-sm font-mono text-accent">{rankUpdate.rpAfter} RP</p>
            </div>
          </div>
          {rankUpdate.promoted && <p className="text-sm font-bold text-green-500 mt-2">🎉 Promoted!</p>}
          {rankUpdate.demoted && <p className="text-sm font-bold text-red-500 mt-2">📉 Demoted</p>}
        </motion.div>
      )}

      <div className="w-full space-y-3">
        {sorted.map((p, i) => (
          <motion.div key={p.userId} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${p.userId === myUserId ? 'bg-accent/10 border border-accent/20' : 'bg-white'} shadow-sm`}>
            <span className="text-xl">{medals[i] ?? `#${i + 1}`}</span>
            <div className="w-9 h-9 rounded-full overflow-hidden relative">
              <Image src={p.avatar ?? getFallbackAvatar(p.username)} fill className="object-cover" alt={p.username} />
            </div>
            <span className="flex-1 font-display font-bold">{p.username}</span>
            <span className={`font-mono font-black text-lg ${p.totalScore < 0 ? 'text-red-500' : 'text-accent'}`}>{p.totalScore}</span>
          </motion.div>
        ))}
      </div>

      <button onClick={onLeave}
        className="w-full py-4 bg-accent text-white rounded-full font-display font-bold shadow-lg mt-2">
        Back to Lobby
      </button>
    </div>
  )
}
