'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Trophy, Timer, Zap, RotateCcw, Play, Pause, AlertCircle, Headphones, Video, User, Library, Globe } from 'lucide-react'
import { formatCount, getFallbackAvatar } from '@/lib/utils'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'

type QuizType = 'anime' | 'title' | 'artist'
type QuizSource = 'random' | 'library'

interface Question {
  questionTheme: any
  options: string[]
  correctValue: string
}

export function QuizClient() {
  const { user } = useAuth()
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'result'>('lobby')
  const [quizType, setQuizType] = useState<QuizType>('anime')
  const [quizSource, setQuizSource] = useState<QuizSource>('random')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timer, setTimer] = useState(20)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [showPlayer, setShowPlayer] = useState(false)
  const [mediaReady, setMediaReady] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const fetchQuestion = useCallback(async (type: QuizType, source: QuizSource = quizSource) => {
    if (totalQuestions >= 10 && totalQuestions > 0) {
      setGameState('result')
      return
    }

    setLoading(true)
    setSelectedOption(null)
    setIsCorrect(null)
    setShowPlayer(false)
    setMediaReady(false)
    try {
      const res = await fetch(`/api/quiz/question?type=${type}&source=${source}`)
      const json = await res.json()
      if (json.success) {
        setCurrentQuestion(json.data)
        setTimer(20)
        setTotalQuestions(prev => prev + 1)
      } else {
        throw new Error(json.error || 'Failed to fetch question')
      }
    } catch (err: any) {
      console.error('Failed to fetch question:', err)
      // If library fails, maybe fallback to random or show error
    } finally {
      setLoading(false)
    }
  }, [totalQuestions, quizSource])

  const startQuiz = (type: QuizType) => {
    setQuizType(type)
    setScore(0)
    setStreak(0)
    setTotalQuestions(0)
    setCorrectCount(0)
    setMaxStreak(0)
    setGameState('playing')
    fetchQuestion(type, quizSource)
  }

  const handleOptionSelect = useCallback(async (option: string) => {
    if (selectedOption || timer === 0) return
    
    setSelectedOption(option)
    const correct = option === currentQuestion?.correctValue
    setIsCorrect(correct)
    
    if (correct) {
      const points = Math.ceil(timer * (1 + streak * 0.1))
      setScore(prev => prev + points)
      setStreak(prev => {
        const next = prev + 1
        if (next > maxStreak) setMaxStreak(next)
        return next
      })
      setCorrectCount(prev => prev + 1)
    } else {
      setStreak(0)
    }

    // Save attempt
    try {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeSlug: currentQuestion?.questionTheme.slug,
          atEntryId: currentQuestion?.questionTheme.entries[0]?.atEntryId,
          quizType,
          correct,
          timeTaken: 20 - timer,
          score: correct ? Math.ceil(timer * (1 + streak * 0.1)) : 0,
          streak: correct ? streak + 1 : 0
        })
      })
    } catch (err) {
      console.error('Failed to save quiz result:', err)
    }

    // Reveal play button to see what it was
    setShowPlayer(true)
    
    // Auto next after 2 seconds if correct, 3 if wrong
    setTimeout(() => {
        if (gameState === 'playing') {
          if (totalQuestions >= 10) {
            setGameState('result')
          } else {
            fetchQuestion(quizType)
          }
        }
    }, correct ? 2000 : 3500)
  }, [selectedOption, timer, currentQuestion, quizType, streak, gameState, fetchQuestion, totalQuestions, maxStreak])

  useEffect(() => {
    if (gameState === 'lobby') {
      fetch('/api/quiz/leaderboard')
        .then(res => res.json())
        .then(json => {
          if (json.success) setLeaderboard(json.data)
        })
    }
  }, [gameState])

  useEffect(() => {
    if (gameState === 'playing' && timer > 0 && !selectedOption && mediaReady) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev - 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    if (timer === 0 && !selectedOption && mediaReady) {
      handleOptionSelect('') // Timeout
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState, timer, selectedOption, handleOptionSelect, mediaReady])

  if (gameState === 'lobby') {
    return (
      <div className="py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-black text-ktext-primary tracking-tight">Theme Quiz</h1>
          <p className="text-ktext-secondary font-body">Ready to prove your anime knowledge?</p>
        </div>

        {/* Source Toggle */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-bg-surface p-1 rounded-2xl border border-border-subtle shadow-sm flex items-center gap-1">
            <button
              onClick={() => setQuizSource('random')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-body font-bold text-sm transition-all interactive
                ${quizSource === 'random' 
                  ? 'bg-accent text-white shadow-md' 
                  : 'text-ktext-secondary hover:text-ktext-primary hover:bg-bg-elevated'}`}
            >
              <Globe className="w-4 h-4" />
              Global Themes
            </button>
            <button
              onClick={() => setQuizSource('library')}
              disabled={!user?.anilist?.userId}
              title={!user?.anilist?.userId ? 'Connect AniList to use your library' : ''}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-body font-bold text-sm transition-all interactive
                ${quizSource === 'library' 
                  ? 'bg-accent text-white shadow-md' 
                  : !user?.anilist?.userId 
                    ? 'opacity-40 cursor-not-allowed text-ktext-disabled' 
                    : 'text-ktext-secondary hover:text-ktext-primary hover:bg-bg-elevated'}`}
            >
              <Library className="w-4 h-4" />
              My Library
            </button>
          </div>
          {!user?.anilist?.userId && (
            <p className="text-[10px] font-body text-ktext-tertiary uppercase tracking-wider">
              Login with AniList to quiz on your completed list
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'anime', label: 'Anime Title', icon: Video, color: 'text-accent', bg: 'bg-accent-container', desc: 'Identify the show' },
            { id: 'title', label: 'Song Title', icon: Headphones, color: 'text-accent-mint', bg: 'bg-accent-mint-container', desc: 'Identify the tracks' },
            { id: 'artist', label: 'The Artist', icon: User, color: 'text-accent-ed', bg: 'bg-accent-ed-container', desc: 'Who is performing?' },
          ].map((mode: any) => (
            <button
              key={mode.id}
              onClick={() => startQuiz(mode.id)}
              className="flex flex-col items-center justify-center p-8 bg-bg-surface rounded-[32px] border border-border-subtle 
                         shadow-card hover:shadow-card-hover hover:border-border-accent transition-all interactive group text-center"
            >
              <div className={`w-16 h-16 rounded-2xl ${mode.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                <mode.icon className={`w-8 h-8 ${mode.color}`} />
              </div>
              <span className="text-xl font-display font-bold text-ktext-primary mb-1">{mode.label}</span>
              <span className="text-xs font-body text-ktext-tertiary">{mode.desc}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-bg-elevated p-8 rounded-[32px] border border-border-default h-fit">
             <div className="flex items-center gap-3 mb-6">
               <Trophy className="w-6 h-6 text-yellow-500" />
               <h3 className="text-xl font-display font-bold text-ktext-primary">Rules of Play</h3>
             </div>
             <ul className="space-y-4 text-sm font-body text-ktext-secondary">
               <li className="flex items-start gap-3">
                 <div className="w-5 h-5 rounded-full bg-accent-container flex items-center justify-center text-[10px] text-accent font-bold mt-0.5">1</div>
                 <span>A round consists of 10 random themes from our library.</span>
               </li>
               <li className="flex items-start gap-3">
                 <div className="w-5 h-5 rounded-full bg-accent-container flex items-center justify-center text-[10px] text-accent font-bold mt-0.5">2</div>
                 <span>Remaining time counts towards your bonus points.</span>
               </li>
               <li className="flex items-start gap-3">
                 <div className="w-5 h-5 rounded-full bg-accent-container flex items-center justify-center text-[10px] text-accent font-bold mt-0.5">3</div>
                 <span>Keep a streak! Every correct answer increases your bonus (+10% per streak).</span>
               </li>
               <li className="flex items-start gap-3">
                 <div className="w-5 h-5 rounded-full bg-accent-container flex items-center justify-center text-[10px] text-accent font-bold mt-0.5">4</div>
                 <span>Missing an answer resets your streak back to zero.</span>
               </li>
             </ul>
          </div>

          <div className="bg-bg-surface p-8 rounded-[32px] border border-border-subtle shadow-card">
            <h3 className="text-xl font-display font-bold text-ktext-primary mb-6">Leaderboard</h3>
            <div className="space-y-3">
              {leaderboard.length > 0 ? (
                leaderboard.map((item, idx) => (
                  <div key={item._id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-bg-elevated transition-colors">
                    <span className={`w-6 text-sm font-mono font-bold ${idx < 3 ? 'text-accent' : 'text-ktext-tertiary'}`}>
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-bg-elevated overflow-hidden relative border border-border-subtle">
                      <Image 
                        src={item.userId?.avatarUrl ?? getFallbackAvatar(item.userId?.username || String(idx))} 
                        fill 
                        unoptimized
                        className="object-cover" 
                        alt="p" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-bold text-ktext-primary truncate">{item.userId?.displayName || 'Anonymous'}</p>
                      <p className="text-[10px] font-mono text-ktext-tertiary uppercase">{item.quizType}</p>
                    </div>
                    <p className="text-sm font-mono font-bold text-accent">{formatCount(item.score)}</p>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-ktext-tertiary font-body italic">No high scores yet!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'result') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-12 max-w-lg mx-auto text-center space-y-8"
      >
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full bg-accent-container flex items-center justify-center mx-auto mb-4 animate-bounce">
            <Trophy className="w-12 h-12 text-accent" />
          </div>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5 }}
            className="absolute -top-2 -right-2 bg-yellow-400 text-white p-2 rounded-full shadow-lg"
          >
            <Zap className="w-4 h-4 fill-current" />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-ktext-primary">Quiz Complete!</h2>
          <p className="text-ktext-secondary font-body">Terrific effort on the {quizType} quiz</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-surface p-6 rounded-[24px] border border-border-subtle shadow-card">
            <p className="text-3xl font-mono font-bold text-accent">{formatCount(score)}</p>
            <p className="text-xs font-body text-ktext-tertiary uppercase mt-1">Final Score</p>
          </div>
          <div className="bg-bg-surface p-6 rounded-[24px] border border-border-subtle shadow-card">
            <p className="text-3xl font-mono font-bold text-accent-mint">{correctCount}/10</p>
            <p className="text-xs font-body text-ktext-tertiary uppercase mt-1">Accuracy</p>
          </div>
          <div className="bg-bg-surface p-6 rounded-[24px] border border-border-subtle shadow-card">
            <p className="text-3xl font-mono font-bold text-accent-ed">{maxStreak}</p>
            <p className="text-xs font-body text-ktext-tertiary uppercase mt-1">Max Streak</p>
          </div>
          <div className="bg-bg-surface p-6 rounded-[24px] border border-border-subtle shadow-card">
            <p className="text-3xl font-mono font-bold text-ktext-primary">{Math.round((correctCount/10) * 100)}%</p>
            <p className="text-xs font-body text-ktext-tertiary uppercase mt-1">Performance</p>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button 
            onClick={() => startQuiz(quizType)}
            className="w-full py-4 bg-accent text-white rounded-[20px] font-display font-bold shadow-lg shadow-accent/20 interactive"
          >
            Play Again
          </button>
          <button 
            onClick={() => setGameState('lobby')}
            className="w-full py-4 bg-bg-surface text-ktext-primary rounded-[20px] font-display font-bold border border-border-default interactive"
          >
            Return to Lobby
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="py-8 max-w-2xl mx-auto space-y-6">
      {/* HUD */}
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-4">
            <div className="bg-bg-surface px-4 py-2 rounded-full border border-border-subtle shadow-sm flex items-center gap-2">
              <Timer className={`w-4 h-4 ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-accent'}`} />
              <span className={`font-mono font-bold ${timer <= 5 ? 'text-red-500' : 'text-ktext-primary'}`}>
                {mediaReady ? `${timer}s` : 'Buffering...'}
              </span>
            </div>
            <div className="bg-bg-surface px-4 py-2 rounded-full border border-border-subtle shadow-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-mono font-bold text-ktext-primary">{streak} streak</span>
            </div>
         </div>
         <div className="text-right">
            <p className="text-[10px] font-mono font-bold text-ktext-tertiary uppercase">Score</p>
            <p className="text-2xl font-mono font-bold text-accent">{formatCount(score)}</p>
         </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion?.questionTheme?.slug || 'loading'}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Question Media */}
          <div className="relative aspect-video bg-black rounded-[24px] overflow-hidden shadow-2xl border border-white/10 group">
             {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
             ) : (
                <>
                  {/* Hide video content based on mode if not answered */}
                  <video 
                    ref={videoRef}
                    autoPlay
                    onPlaying={() => setMediaReady(true)}
                    src={currentQuestion?.questionTheme.videoUrl}
                    className={`w-full h-full object-cover transition-all duration-700
                      ${(quizType === 'anime' && !selectedOption) ? 'blur-2xl opacity-50' : 'opacity-100'}`}
                  />
                  
                  {/* Audio visualizer hint in Listen/Anime mode */}
                  {quizType === 'anime' && !selectedOption && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="flex items-end gap-1.5 h-12 opacity-50">
                           {[...Array(8)].map((_, i) => (
                             <div key={i} className={`w-2 bg-white/50 rounded-full eq-bar-${(i % 4) + 1}`} />
                           ))}
                        </div>
                     </div>
                  )}

                  {selectedOption && (
                    <div className="absolute top-4 right-4 z-50 animate-in zoom-in duration-300">
                       <div className={`px-4 py-2 rounded-full font-display font-bold text-white shadow-xl 
                                     ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                          {isCorrect ? '✓ Correct!' : '✗ Wrong!'}
                       </div>
                    </div>
                  )}
                </>
             )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
             {currentQuestion?.options.map((option, idx) => {
                const isSelected = selectedOption === option
                const isAnswer = option === currentQuestion.correctValue
                
                let buttonStyle = "bg-bg-surface border-border-default text-ktext-primary hover:border-accent"
                if (selectedOption) {
                   if (isAnswer) buttonStyle = "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20"
                   else if (isSelected && !isAnswer) buttonStyle = "bg-red-500 border-red-500 text-white"
                   else buttonStyle = "bg-bg-surface border-border-default text-ktext-disabled opacity-50"
                }

                return (
                  <button
                    key={idx}
                    disabled={!!selectedOption}
                    onClick={() => handleOptionSelect(option)}
                    className={`w-full p-4 rounded-[16px] border-2 font-body font-bold text-left transition-all interactive
                               ${buttonStyle} ${!selectedOption && 'hover:translate-x-1'}`}
                  >
                    <div className="flex items-center gap-3">
                       <span className="w-6 h-6 rounded-md bg-black/5 flex items-center justify-center text-xs font-mono">
                          {String.fromCharCode(65 + idx)}
                       </span>
                       {option || 'Unknown'}
                    </div>
                  </button>
                )
             })}
          </div>

          {selectedOption && !isCorrect && (
             <div className="bg-bg-surface p-4 rounded-[16px] border border-red-200/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                   <p className="text-sm font-body font-bold text-red-500">The correct answer was:</p>
                   <p className="text-lg font-display font-bold text-ktext-primary">{currentQuestion?.correctValue}</p>
                </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="pt-4 flex justify-center">
         <button 
           onClick={() => setGameState('lobby')}
           className="flex items-center gap-2 text-sm font-body text-ktext-tertiary hover:text-accent transition-colors"
         >
           <RotateCcw className="w-4 h-4" />
           New Game
         </button>
      </div>
    </div>
  )
}
