'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft, Check, X, Trophy, Music2, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { authFetch } from '@/lib/auth-client'

interface Question {
  questionTheme: {
    audioUrl: string
    animeTitle: string
    songTitle: string
    artistName?: string
    imageUrl?: string
  }
  options: string[]
  correctValue: string
}

function QuizPlayContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const type = searchParams.get('type') || 'anime'
  const source = searchParams.get('source') || 'random'

  const [round, setRound] = useState(1)
  const [score, setScore] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchQuestion = async () => {
    setLoading(true)
    setSelectedOption(null)
    setIsAnswered(false)
    try {
      const res = await authFetch(`/api/quiz/question?type=${type}&source=${source}`)
      const json = await res.json()
      if (json.success) {
        setQuestion(json.data)
      } else {
        setError(json.error || 'Failed to load question')
      }
    } catch (err) {
      setError('An error occurred while fetching question')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuestion()
  }, [])

  useEffect(() => {
    if (question && audioRef.current) {
      audioRef.current.src = question.questionTheme.audioUrl
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(e => console.log('Audio play failed', e))
    }
  }, [question])

  const handleOptionClick = (option: string) => {
    if (isAnswered) return
    setSelectedOption(option)
    setIsAnswered(true)

    if (option === question?.correctValue) {
      setScore(prev => prev + 400) // 400 points per correct answer
    }

    // Move to next round after 2 seconds
    setTimeout(() => {
      if (round < 10) {
        setRound(prev => prev + 1)
        fetchQuestion()
      } else {
        setIsGameOver(true)
      }
    }, 2000)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#fffafa]">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
          <X className="w-8 h-8 text-error" />
        </div>
        <p className="text-error font-display font-bold text-xl mb-6">{error}</p>
        <Link href="/quiz" className="px-8 py-4 bg-accent text-white rounded-2xl font-bold shadow-lg interactive">
          Go Back
        </Link>
      </div>
    )
  }

  if (isGameOver) {
    return (
      <div className="max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center p-6 bg-[#fffafa]">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center w-full"
        >
          <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-accent" />
          </div>
          <h1 className="text-4xl font-display font-black text-[#831843] mb-2">Quiz Complete!</h1>
          <p className="text-ktext-tertiary mb-10">You have completed all rounds.</p>
          
          <div className="bg-white rounded-[48px] p-12 shadow-2xl shadow-pink-200/50 border border-pink-50 mb-10 w-full max-w-sm mx-auto">
            <p className="text-[10px] font-display font-bold text-pink-300 uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className="text-7xl font-display font-black text-accent">{score}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
            <button 
              onClick={() => {
                setRound(1)
                setScore(0)
                setIsGameOver(false)
                fetchQuestion()
              }}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-accent text-white font-display font-bold shadow-lg interactive"
            >
              <RotateCcw className="w-5 h-5" />
              Retry
            </button>
            <Link 
              href="/quiz"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-pink-100 text-accent font-display font-bold interactive"
            >
              <Home className="w-5 h-5" />
              Finish
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-[#fffafa] flex flex-col overflow-hidden">
      <audio ref={audioRef} />

      {/* Header matching screenshot */}
      <header className="px-6 h-20 flex items-center justify-between relative bg-white/50 backdrop-blur-md">
        <button 
          onClick={() => router.back()}
          className="w-11 h-11 rounded-full bg-[#fdf2f2] flex items-center justify-center text-accent interactive"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <p className="text-[10px] font-display font-bold text-ktext-tertiary uppercase tracking-[0.1em] mb-0.5">
            ROUND {round}/10
          </p>
          <p className="text-xl font-display font-black text-black">
            Score: {score}
          </p>
        </div>

        <div className="w-11" /> {/* Spacer */}
      </header>

      {/* Progress Bar precisely as screenshot */}
      <div className="h-1.5 w-full bg-[#fdf2f2] relative">
        <motion.div 
          className="absolute top-0 left-0 bottom-0 bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${(round / 10) * 100}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 50 }}
        />
      </div>

      <main className="flex-1 px-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {!loading && question ? (
            <motion.div 
              key={round}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center"
            >
              <h2 className="text-3xl font-display font-black text-[#1a0b10] mb-10 text-center tracking-tight">
                {type === 'anime' ? 'Guess the Anime!' : type === 'title' ? 'Guess the Opening!' : 'Guess the Artist!'}
              </h2>

              {/* Vinyl Record Refined */}
              <div className="relative mb-10">
                {/* Glow Effect */}
                <motion.div 
                  className="absolute inset-[-20px] bg-accent/5 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                {/* Outer Record */}
                <motion.div 
                  className="relative w-56 h-56 rounded-full bg-[#0d0d0d] shadow-[0_15px_40px_rgba(0,0,0,0.4)] flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                >
                  {/* Fine Grooves */}
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i}
                      className="absolute rounded-full border border-white/[0.04]"
                      style={{ inset: `${(i + 1) * 8}px` }}
                    />
                  ))}
                  
                  {/* Label with color gradient like screenshot */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#ff9a9e] via-[#fecfef] to-[#ff9a9e] flex items-center justify-center p-1 overflow-hidden">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-[#f093fb] to-[#f5576c] flex items-center justify-center relative">
                        <div className="w-4 h-4 rounded-full bg-white/40 absolute" />
                        <div className="w-2 h-2 rounded-full bg-[#fffafa] absolute" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Visualizer matching screenshot colors */}
              <div className="flex items-center gap-1.5 h-8 mb-10">
                {[1, 2, 3, 4].map(i => (
                  <motion.div 
                    key={i}
                    className="w-2 bg-accent rounded-full"
                    animate={{ height: [8, 24, 12, 20, 8] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </div>

              {/* Options matching screenshot exactly */}
              <div className="w-full space-y-3 mb-8 max-w-sm">
                {question.options.map((option, i) => {
                  const isSelected = selectedOption === option
                  const isCorrect = option === question.correctValue
                  const showSuccess = isAnswered && isCorrect
                  const showFailure = isAnswered && isSelected && !isCorrect
                  
                  let stateStyle = "bg-[#fdf2f2] text-[#1a0b10] border-transparent"
                  
                  if (isAnswered) {
                    if (isCorrect) {
                      stateStyle = "bg-[#d1fae5] text-[#065f46] border-transparent"
                    } else if (isSelected) {
                      stateStyle = "bg-[#fee2e2] text-[#991b1b] border-[#fecaca]"
                    } else {
                      stateStyle = "bg-[#fdf2f2] text-ktext-disabled opacity-40"
                    }
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => handleOptionClick(option)}
                      disabled={isAnswered}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className={`
                        w-full h-[72px] px-8 rounded-full border-[1.5px] flex items-center justify-between
                        font-display font-bold text-base transition-all duration-300
                        ${stateStyle}
                        ${!isAnswered && 'hover:bg-white hover:border-pink-200 hover:shadow-lg active:scale-[0.98]'}
                      `}
                    >
                      <span className="truncate pr-4">{option}</span>
                      <AnimatePresence>
                        {(showSuccess || showFailure) && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${showSuccess ? 'bg-[#059669] text-white' : 'bg-[#dc2626] text-white'}`}
                          >
                            {showSuccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="relative w-20 h-20 mb-8">
                 <motion.div 
                    className="absolute inset-0 border-4 border-accent/10 rounded-full"
                 />
                 <motion.div 
                    className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                 />
              </div>
              <p className="text-[#831843] font-display font-black text-xl animate-pulse">Loading Round {round}...</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function QuizPlayPage() {
  return (
    <Suspense fallback={null}>
      <QuizPlayContent />
    </Suspense>
  )
}
