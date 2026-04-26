'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Check, X, Timer, Users, Settings, Crown, Zap, Clock, Music2, Copy } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { authFetch } from '@/lib/auth-client'
import { pusherClient } from '@/lib/pusher-client'
import { getFallbackAvatar } from '@/lib/utils'
import { toast } from 'sonner'
import { RevealView, ResultsView, LiveScoreboard } from './quiz-room-components'
import type { QuizRoomData, Player, RoundAnswer, RoundReveal, GamePhase, RankUpdateData } from './quiz-room-types'

export default function QuizRoomClient({ initialRoom }: { initialRoom: QuizRoomData }) {
  const router = useRouter()
  const { user } = useAuth()
  const [room, setRoom] = useState<QuizRoomData>(initialRoom)
  const [phase, setPhase] = useState<GamePhase>(initialRoom.status === 'in_progress' ? 'game' : 'lobby')
  const [options, setOptions] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [autoLocked, setAutoLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(room.settings.timeLimitSeconds || 30)
  const [roundAnswers, setRoundAnswers] = useState<RoundAnswer[]>([])
  const [reveal, setReveal] = useState<RoundReveal | null>(null)
  const [rankUpdate, setRankUpdate] = useState<RankUpdateData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [currentRound, setCurrentRound] = useState(initialRoom.currentRound || 0)
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentRoundRef = useRef(initialRoom.currentRound || 0)

  const [audio] = useState(() => {
    if (typeof Audio !== 'undefined') {
      const a = new Audio()
      a.preload = 'auto'
      // Set these for better mobile compatibility
      a.setAttribute('playsinline', 'true')
      a.setAttribute('webkit-playsinline', 'true')
      return a
    }
    return null
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    if (audio) {
      audioRef.current = audio
    }
  }, [audio])

  // Global unmute listener
  useEffect(() => {
    const handleGlobalClick = () => {
      if (audioRef.current && audioRef.current.muted) {
        console.log('[Audio] Global click detected, attempting unmute')
        audioRef.current.muted = false
        audioRef.current.play().catch(() => {})
      }
    }
    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('touchstart', handleGlobalClick)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('touchstart', handleGlobalClick)
    }
  }, [])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startedAtRef = useRef<number>(0)
  const timeLimitRef = useRef<number>(30)

  const myUserId = user?.id ?? ''
  const isHost = String(room.hostId) === myUserId
  const isDuel = room.roomType === 'duel'
  const myPlayer = room.players.find(p => p.userId === myUserId)
  const totalRounds = room.settings.roundCount

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const upsertRoundAnswer = useCallback((answer: RoundAnswer) => {
    setRoundAnswers(prev => {
      const existingIndex = prev.findIndex(item => item.userId === answer.userId)
      if (existingIndex === -1) {
        return [...prev, answer]
      }

      const next = [...prev]
      next[existingIndex] = { ...next[existingIndex], ...answer }
      return next
    })
  }, [])

  const handleTimeout = useCallback(async () => {
    if (!isHost) return
    try {
      await authFetch('/api/quiz/room/timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id }),
      })
    } catch (e: any) {
      console.error('[Timeout] Failed to trigger server timeout:', e)
    }
  }, [isHost, room._id])

  const startTimer = useCallback((serverStartedAt: number, limit: number) => {
    stopTimer()
    timeLimitRef.current = limit
    startedAtRef.current = serverStartedAt
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
      const left = Math.max(0, timeLimitRef.current - elapsed)
      setTimeLeft(left)
      if (left === 0) {
        stopTimer()
        // Use a timeout to ensure state is processed, and trigger server timeout if host
        if (isHost) {
          handleTimeout()
        }
      }
    }, 500)
  }, [stopTimer, isHost, handleTimeout])

  // Load audio, play it, then start timer 1s after it begins
  const loadAndPlayAudio = useCallback((url: string, serverStartedAt: number, limit: number) => {
    console.log('[Audio] loadAndPlayAudio called:', url);
    const audio = audioRef.current
    if (!audio) return

    // Stop any existing fade-outs
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current)
      fadeIntervalRef.current = null
    }

    audio.pause()
    audio.muted = false 
    audio.volume = 0.5
    
    let timerStarted = false
    const triggerTimer = () => {
      if (timerStarted) return
      timerStarted = true
      console.log('[Audio] Triggering timer start');
      setTimeout(() => startTimer(serverStartedAt, limit), 1000)
    }

    // Safety fallback for timer if oncanplay never fires
    const fallback = setTimeout(() => {
      if (!timerStarted) {
        console.warn('[Audio] canplay timeout - forcing timer start')
        triggerTimer()
      }
    }, 5000)

    audio.oncanplay = () => {
      console.log('[Audio] oncanplay fired');
      clearTimeout(fallback)
      triggerTimer()
    }

    // Attempt playback
    const attemptPlay = async () => {
      try {
        await audio.play()
        console.log('[Audio] play() success (unmuted)');
      } catch (err) {
        console.warn('[Audio] play() unmuted failed, trying muted fallback:', err)
        audio.muted = true
        try {
          await audio.play()
          console.log('[Audio] play() success (muted)');
        } catch (finalErr) {
          console.error('[Audio] play() failed even when muted:', finalErr)
          triggerTimer() 
        }
      }
    }

    audio.src = url
    attemptPlay()
  }, [audio, startTimer])

  useEffect(() => {
    if (!user?.id) return
    const channelName = `presence-quiz-room-${room._id}`
    const channel = pusherClient.subscribe(channelName)

    channel.bind('room:player-joined', (data: any) => {
      setRoom(prev => ({ ...prev, players: data.players ?? prev.players }))
    })
    channel.bind('room:player-left', (data: any) => {
      setRoom(prev => {
        const isNowHost = data.newHostId === myUserId && prev.hostId !== myUserId
        if (isNowHost) {
          toast.success('You are now the host! 👑')
        }
        
        return {
          ...prev,
          players: prev.players.filter(p => p.userId !== data.userId),
          hostId: data.newHostId ?? prev.hostId,
          status: data.roomStatus === 'ended' ? 'ended' : prev.status,
        }
      })
      if (data.roomStatus === 'ended') setPhase('results')
    })
    channel.bind('room:player-ready', (data: any) => {
      setRoom(prev => ({
        ...prev,
        players: data.players ?? prev.players.map((p: Player) =>
          p.userId === data.userId ? { ...p, ready: data.ready } : p
        ),
      }))
    })
    channel.bind('room:settings-updated', (data: any) => {
      setRoom(prev => ({ ...prev, settings: { ...prev.settings, ...data.settings } }))
      toast.info('Room settings updated')
    })
    channel.bind('room:closed', (data: any) => {
      toast.error(`Room closed: ${data.reason === 'inactivity' ? 'Inactive for too long' : 'Closed by host'}`)
      router.push('/quiz/multiplayer')
    })
    channel.bind('room:round-started', (data: any) => {
      const limit = data.timeLimitSeconds ?? 30
      const serverStartedAt = new Date(data.startedAt).getTime()
      currentRoundRef.current = data.round
      setTimeLimitSeconds(limit)
      setTimeLeft(limit) // Reset display immediately
      setOptions(data.theme.options ?? [])
      setVideoUrl(data.theme.videoUrl ?? '')
      setSelected(null)
      setAnswered(false)
      setAutoLocked(false)
      setSubmitting(false)
      setRoundAnswers([])
      setReveal(null)
      setCurrentRound(data.round)
      setPhase('game')
      // Load audio and start timer 1s after playback begins
      loadAndPlayAudio(data.theme.videoUrl, serverStartedAt, limit)
    })
    channel.bind('room:player-answered', (data: any) => {
      if (typeof data.round === 'number' && data.round !== currentRoundRef.current) {
        return
      }

      if (data.userId === myUserId && data.autoLocked) {
        setSelected(null)
        setAutoLocked(true)
        setAnswered(true)
        stopTimer()
        toast.warning('You were auto-locked! 🔒')
      }

      upsertRoundAnswer({
        userId: data.userId,
        submittedAnswer: data.submittedAnswer ?? '',
        correct: Boolean(data.correct),
        secondsRemaining: 0,
        baseScore: data.totalScoreGained ?? 0,
        bonusScore: data.bonusScore ?? 0,
        totalScoreGained: data.totalScoreGained ?? 0,
        autoLocked: data.autoLocked ?? false,
      })
    })
    channel.bind('room:round-ended', (data: any) => {
      if (typeof data.round === 'number' && data.round !== currentRoundRef.current) {
        return
      }

      stopTimer()
      // Fade out audio
      if (audioRef.current) {
        const audio = audioRef.current
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current)
        fadeIntervalRef.current = setInterval(() => {
          if (audio.volume > 0.05) { audio.volume = Math.max(0, audio.volume - 0.1) }
          else { 
            clearInterval(fadeIntervalRef.current!)
            fadeIntervalRef.current = null
            audio.pause()
            audio.volume = 0.6 
          }
        }, 80)
      }
      setRoom(prev => ({ ...prev, players: data.players ?? prev.players, status: data.gameOver ? 'ended' : prev.status }))
      setRoundAnswers(data.answers ?? [])
      setReveal({
        correctAnswer: data.correctAnswer,
        answers: data.answers ?? [],
        theme: data.theme ?? {},
        players: data.players ?? [],
        gameOver: data.gameOver,
      })
      setPhase(data.gameOver ? 'results' : 'reveal')
    })

    channel.bind('room:rank-updated', (data: any) => {
      if (data.userId === myUserId) {
        setRankUpdate(data)
      }
    })

    return () => {
      channel.unbind_all()
      pusherClient.unsubscribe(channelName)
      stopTimer()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [user?.id, room._id, myUserId, loadAndPlayAudio, startTimer, stopTimer, upsertRoundAnswer])

  // Heartbeat Effect
  useEffect(() => {
    if (!user?.id || !room?._id) return
    
    // Initial heartbeat to mark as active immediately
    authFetch('/api/quiz/room/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: room._id }),
    }).catch(() => {})

    const interval = setInterval(async () => {
      try {
        await authFetch('/api/quiz/room/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room._id }),
        })
      } catch (err: any) {
        if (err.message?.includes('closed')) {
          router.push('/quiz/multiplayer')
        }
        console.error('Heartbeat failed:', err)
      }
    }, 15000) // 15 seconds
    
    return () => clearInterval(interval)
  }, [user?.id, room?._id, router])

  // Auto-advance logic for Reveal phase
  useEffect(() => {
    if (phase === 'reveal' && isHost && !reveal?.gameOver) {
      const autoNextTimer = setTimeout(() => {
        handleNext()
      }, 6000) // 6 seconds to look at results
      return () => clearTimeout(autoNextTimer)
    }
  }, [phase, isHost, reveal?.gameOver])

  const handleSelectOption = async (option: string) => {
    if (answered || autoLocked || submitting) return
    const answerRound = currentRoundRef.current
    setSelected(option)
    setAnswered(true)
    setSubmitting(true)
    stopTimer()
    try {
      const res = await authFetch('/api/quiz/room/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id, submittedAnswer: option }),
      })
      const data = await res.json()

      if (answerRound !== currentRoundRef.current) {
        return
      }

      if (data.autoLocked) {
        setSelected(null)
        setAutoLocked(true)
        upsertRoundAnswer({
          userId: myUserId,
          submittedAnswer: '',
          correct: false,
          secondsRemaining: 0,
          baseScore: 0,
          bonusScore: 0,
          totalScoreGained: 0,
          autoLocked: true,
        })
        return
      }

      upsertRoundAnswer({
        userId: myUserId,
        submittedAnswer: option,
        correct: Boolean(data.correct),
        secondsRemaining: data.secondsRemaining ?? 0,
        baseScore: data.baseScore ?? 0,
        bonusScore: data.bonusScore ?? 0,
        totalScoreGained: data.totalScoreGained ?? 0,
        autoLocked: false,
      })
    } catch (e: any) {
      if (answerRound !== currentRoundRef.current) {
        return
      }

      if (e?.message?.includes('auto')) {
        setSelected(null)
        setAutoLocked(true)
        toast.warning('Auto-locked! 🔒')
      } else {
        setSelected(null)
        setAnswered(false)
        toast.error(e?.message || 'Failed to submit')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleReady = async () => {
    try {
      // Unlock audio context for mobile/safari/chrome
      if (audioRef.current) {
        setIsAudioUnlocked(true)
        // Silent ping to unlock
        audioRef.current.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA== ";
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      await authFetch('/api/quiz/room/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id }),
      })
    } catch (e: any) { toast.error(e?.message || 'Failed') }
  }

  const handleStart = async () => {
    try {
      // Unlock audio context
      if (audioRef.current) {
        setIsAudioUnlocked(true)
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      await authFetch('/api/quiz/room/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id }),
      })
    } catch (e: any) { toast.error(e?.message || 'Failed to start') }
  }

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      await authFetch('/api/quiz/room/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id, settings: newSettings }),
      })
      setShowSettings(false)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update settings')
    }
  }

  const handleNext = async () => {
    try {
      // Unlock audio context
      if (audioRef.current) {
        setIsAudioUnlocked(true)
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      await authFetch('/api/quiz/room/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id }),
      })
    } catch (e: any) { toast.error(e?.message || 'Failed') }
  }


  const handleLeave = async () => {
    try {
      await authFetch('/api/quiz/room/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room._id }),
      })
    } catch {}
    router.push('/quiz/multiplayer')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode)
    toast.success('Room code copied! 📋')
  }

  const myScore = room.players.find(p => p.userId === myUserId)?.totalScore ?? 0
  const guessLabel = room.settings.guessType === 'anime' ? 'Guess the Anime!' : room.settings.guessType === 'song' ? 'Guess the Opening!' : 'Guess the Artist!'

  if (phase === 'results' || (phase === 'reveal' && reveal?.gameOver)) {
    const finalPlayers = reveal?.players ?? room.players
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa]">
        <header className="px-6 h-16 flex items-center">
          <button onClick={handleLeave} className="w-10 h-10 rounded-full bg-[#fdf2f2] flex items-center justify-center text-accent">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <ResultsView players={finalPlayers} myUserId={myUserId} onLeave={handleLeave} rankUpdate={rankUpdate} />
      </div>
    )
  }

  if (phase === 'reveal' && reveal) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa] overflow-y-auto">
        <header className="px-6 h-16 flex items-center gap-3">
          <button onClick={handleLeave} className="w-10 h-10 rounded-full bg-[#fdf2f2] flex items-center justify-center text-accent">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-black text-accent flex-1 text-lg">Round Reveal</span>
          <span className="font-mono font-bold text-ktext-tertiary text-sm">{room.roomCode}</span>
        </header>
        <RevealView
          reveal={reveal}
          myUserId={myUserId}
          onNext={handleNext}
          isHost={isHost}
          isLastRound={currentRound >= totalRounds}
          currentRound={currentRound}
          totalRounds={totalRounds}
        />
      </div>
    )
  }

  if (phase === 'lobby') {
    const allReady = room.players.length >= 2 && room.players.every(p => p.ready)
    const myReady = myPlayer?.ready ?? false
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa] flex flex-col">
        <header className="px-6 h-16 flex items-center gap-3">
          <button onClick={handleLeave} className="w-10 h-10 rounded-full bg-[#fdf2f2] flex items-center justify-center text-accent">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-black text-accent text-xl flex-1">{isDuel ? 'Duel' : 'Party'} Room</span>
          <button onClick={handleCopyCode} className="bg-accent/10 px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-accent/20 transition-colors group">
            <span className="font-mono font-black text-accent text-sm">{room.roomCode}</span>
            <Copy className="w-3.5 h-3.5 text-accent opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        </header>

        <div className="flex-1 px-6 pb-8 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-pink-50">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-accent" />
              <span className="font-display font-bold text-sm text-accent">Players ({room.players.length}/{room.settings.maxPlayers})</span>
            </div>
            <div className="space-y-2">
              {room.players.map(p => (
                <div key={p.userId} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden relative">
                    <Image src={p.avatar ?? getFallbackAvatar(p.username)} fill className="object-cover" alt={p.username} />
                  </div>
                  <span className="flex-1 font-display font-bold text-sm">{p.username}</span>
                  {room.hostId === p.userId && <Crown className="w-4 h-4 text-yellow-500" />}
                  {isDuel && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.ready ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.ready ? 'Ready' : 'Not Ready'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-pink-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                <span className="font-display font-bold text-sm text-accent">Settings</span>
              </div>
              {isHost && (
                <button onClick={() => setShowSettings(true)} className="text-xs font-bold text-accent bg-accent/5 px-2 py-1 rounded-lg hover:bg-accent/10 transition-colors">
                  Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['Mode', room.settings.poolMode],
                ['Guess', room.settings.guessType],
                ['Rounds', String(room.settings.roundCount)],
                ['Time', `${room.settings.timeLimitSeconds}s`],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#fdf2f2] rounded-xl px-3 py-2">
                  <p className="text-ktext-tertiary">{k}</p>
                  <p className="font-bold text-accent capitalize">{v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {isDuel ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleReady}
              className={`w-full py-4 rounded-full font-display font-bold text-lg shadow-lg transition-colors ${myReady ? 'bg-green-500 text-white' : 'bg-accent text-white'}`}>
              {myReady ? '✅ Ready!' : 'Click to Ready'}
            </motion.button>
          ) : isHost ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleStart}
              disabled={room.players.length < 2}
              className="w-full py-4 bg-accent text-white rounded-full font-display font-bold text-lg shadow-lg disabled:opacity-50">
              {room.players.length < 2 ? 'Waiting for players…' : 'Start Game'}
            </motion.button>
          ) : (
            <div className="text-center text-sm text-ktext-tertiary py-4">Waiting for host to start…</div>
          )}
          {isHost && (
            <div className="text-center text-xs text-ktext-tertiary">
              Invite friends using the code <button onClick={handleCopyCode} className="font-mono font-bold text-accent hover:underline decoration-accent/30 underline-offset-2">{room.roomCode}</button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative w-full max-w-sm bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl">
                <h3 className="font-display font-black text-2xl text-accent mb-6">Room Settings</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-ktext-tertiary uppercase tracking-widest mb-2 block">Pool Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['random', 'watched', 'common'].map(m => (
                        <button key={m} onClick={() => handleUpdateSettings({ poolMode: m })}
                          className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${room.settings.poolMode === m ? 'bg-accent text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-ktext-tertiary uppercase tracking-widest mb-2 block">Guess Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['anime', 'song', 'artist'].map(t => (
                        <button key={t} onClick={() => handleUpdateSettings({ guessType: t })}
                          className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${room.settings.guessType === t ? 'bg-accent text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-ktext-tertiary uppercase tracking-widest mb-2 block">Rounds</label>
                      <select value={room.settings.roundCount} onChange={(e) => handleUpdateSettings({ roundCount: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-accent focus:ring-2 focus:ring-accent/20">
                        {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} Rounds</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-ktext-tertiary uppercase tracking-widest mb-2 block">Time Limit</label>
                      <select value={room.settings.timeLimitSeconds} onChange={(e) => handleUpdateSettings({ timeLimitSeconds: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-xl py-2.5 px-4 text-sm font-bold text-accent focus:ring-2 focus:ring-accent/20">
                        {[15, 20, 25, 30].map(n => <option key={n} value={n}>{n}s</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowSettings(false)}
                  className="w-full mt-8 py-4 bg-gray-900 text-white rounded-full font-display font-bold text-sm hover:bg-black transition-colors">
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Game Phase
  const isDisabled = answered || autoLocked || submitting
  return (
    <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa] flex flex-col overflow-hidden">

      <header className="px-6 h-20 flex items-center justify-between bg-white/50 backdrop-blur-md">
        <button onClick={handleLeave} className="w-11 h-11 rounded-full bg-[#fdf2f2] flex items-center justify-center text-accent">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-display font-bold text-ktext-tertiary uppercase tracking-[0.1em] mb-0.5">ROUND {currentRound}/{totalRounds}</p>
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${timeLeft <= 5 ? 'bg-red-50 border-red-100 text-red-500 animate-pulse' : 'bg-pink-50 border-pink-100 text-accent'}`}>
              <Timer className="w-3.5 h-3.5" />
              <span className="text-sm font-mono font-bold">{timeLeft}s</span>
            </div>
            <p className={`text-xl font-display font-black ${myScore < 0 ? 'text-red-500' : 'text-black'}`}>{myScore}</p>
          </div>
        </div>
        <div className="w-11" />
      </header>

      <div className="h-1.5 w-full bg-[#fdf2f2]">
        <motion.div className="h-full bg-accent" animate={{ width: `${(currentRound / totalRounds) * 100}%` }} transition={{ type: 'spring', damping: 20 }} />
      </div>

      <div className="flex-1 px-6 flex flex-col items-center justify-start pt-4 pb-6 overflow-y-auto">
        <h2 className="text-2xl font-display font-black text-[#1a0b10] mb-6 text-center">{guessLabel}</h2>

        <div className="relative mb-6">
          <motion.div className="absolute inset-[-20px] bg-accent/5 rounded-full blur-2xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
          <motion.div className="relative w-44 h-44 rounded-full bg-[#0d0d0d] shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-center"
            animate={{ rotate: answered ? 0 : 360 }} transition={{ duration: 4, repeat: answered ? 0 : Infinity, ease: 'linear' }}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="absolute rounded-full border border-white/[0.04]" style={{ inset: `${(i + 1) * 8}px` }} />
            ))}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff9a9e] via-[#fecfef] to-[#ff9a9e] flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#f093fb] to-[#f5576c] flex items-center justify-center relative">
                <div className="w-4 h-4 rounded-full bg-white/40 absolute" />
                <div className="w-2 h-2 rounded-full bg-[#fffafa] absolute" />
                {autoLocked && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full"><span className="text-white text-lg">🔒</span></div>}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-1.5 h-8 mb-6 relative">
          {[1,2,3,4].map(i => (
            <motion.div key={i} className="w-2 bg-accent rounded-full"
              animate={!answered ? { height: [8, 24, 12, 20, 8] } : { height: 4 }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
          
          {/* Manual Audio Resume Button if blocked */}
          {!answered && (
            <button 
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = false;
                  audioRef.current.play().catch(() => {});
                  setIsAudioUnlocked(true);
                }
              }}
              className="absolute -right-12 top-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent interactive"
              title="Fix Audio"
            >
              <Music2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {autoLocked && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-gray-100 rounded-3xl p-4 text-center mb-4">
            <p className="font-display font-bold text-gray-600">🔒 You were auto-locked for this round</p>
            <p className="text-sm text-gray-400 mt-1">Waiting for round to end…</p>
          </motion.div>
        )}

        <div className="w-full space-y-3 max-w-sm">
          {options.map((option, i) => {
            const myResult = roundAnswers.find(a => a.userId === myUserId)
            const isSelected = selected === option
            const isCorrect = myResult?.correct && isSelected
            const isWrong = myResult && !myResult.correct && isSelected
            const isPending = answered && isSelected && !myResult

            let style = 'bg-[#fdf2f2] text-[#1a0b10] border-transparent'
            
            if (isPending) {
              style = 'bg-accent/10 text-accent border-accent/30 shadow-inner'
            } else if (myResult) {
              if (isCorrect) style = 'bg-[#d1fae5] text-[#065f46] border-transparent'
              else if (isWrong) style = 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
              else style = 'bg-[#fdf2f2] text-ktext-disabled opacity-40'
            } else if (answered && !isSelected) {
              style = 'bg-[#fdf2f2] text-ktext-disabled opacity-40'
            }
            return (
              <motion.button key={i} onClick={() => handleSelectOption(option)} disabled={isDisabled}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className={`w-full h-[68px] px-6 rounded-full border-[1.5px] flex items-center justify-between font-display font-bold text-base transition-all ${style} ${!isDisabled ? 'hover:bg-white hover:border-pink-200 hover:shadow-lg' : ''}`}>
                <span className="truncate pr-4">{option}</span>
                <AnimatePresence>
                  {myResult && isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-[#059669] text-white' : 'bg-[#dc2626] text-white'}`}>
                      {isCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </motion.div>
                  )}
                  {isPending && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>

        <div className="w-full max-w-sm mt-6">
          <p className="text-xs font-bold text-ktext-tertiary mb-2">Live Scores</p>
          <LiveScoreboard players={room.players} myUserId={myUserId} roundAnswers={roundAnswers} />
        </div>
      </div>
    </div>
  )
}
