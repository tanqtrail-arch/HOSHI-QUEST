import { useState, useEffect, useRef, useCallback } from 'react'
import { constellations, getRandomConstellations, type Constellation } from '../data/constellations'

// ---------- Types ----------

type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type GamePhase = 'start' | 'playing' | 'feedback' | 'result'

interface DifficultyOption {
  key: Difficulty
  label: string
  time: number
  description: string
}

interface QuizQuestion {
  constellation: Constellation
  choices: Constellation[]
  correctIndex: number
}

interface RoundResult {
  question: QuizQuestion
  selectedIndex: number | null
  correct: boolean
  timeRemaining: number
  score: number
  combo: number
}

// ---------- Constants ----------

const TOTAL_QUESTIONS = 20

const DIFFICULTIES: DifficultyOption[] = [
  { key: 'beginner', label: '初級', time: 8, description: '8秒' },
  { key: 'intermediate', label: '中級', time: 5, description: '5秒' },
  { key: 'advanced', label: '上級', time: 3, description: '3秒' },
]

const TIMER_TICK_MS = 50

// ---------- Helper: generate quiz questions ----------

function generateQuestions(count: number): QuizQuestion[] {
  const selected = getRandomConstellations(count)
  return selected.map((constellation) => {
    const others = constellations.filter((c) => c.id !== constellation.id)
    const shuffledOthers = others.sort(() => Math.random() - 0.5).slice(0, 3)
    const correctIndex = Math.floor(Math.random() * 4)
    const choices: Constellation[] = [...shuffledOthers]
    choices.splice(correctIndex, 0, constellation)
    return { constellation, choices, correctIndex }
  })
}

// ---------- Helper: calculate score ----------

function calculateScore(
  timeRemaining: number,
  totalTime: number,
  combo: number,
): number {
  const baseScore = 100
  const comboBonus = combo * 10
  const timeBonus = Math.round((timeRemaining / totalTime) * 50)
  return baseScore + comboBonus + timeBonus
}

// ---------- Helper: star rating from accuracy ----------

function getStarRating(accuracy: number): number {
  if (accuracy >= 90) return 5
  if (accuracy >= 75) return 4
  if (accuracy >= 60) return 3
  if (accuracy >= 40) return 2
  return 1
}

// ---------- Canvas: draw constellation ----------

function drawConstellation(
  canvas: HTMLCanvasElement,
  constellation: Constellation,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const width = rect.width
  const height = rect.height

  ctx.clearRect(0, 0, width, height)

  // Dark background
  ctx.fillStyle = 'rgba(10, 10, 30, 0.8)'
  ctx.fillRect(0, 0, width, height)

  const { stars, connections } = constellation

  if (!stars || stars.length === 0) return

  // Compute bounding box of star positions
  const xs = stars.map((s) => s.x)
  const ys = stars.map((s) => s.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1

  const padding = 40
  const drawWidth = width - padding * 2
  const drawHeight = height - padding * 2
  const scale = Math.min(drawWidth / dataWidth, drawHeight / dataHeight)

  const offsetX = padding + (drawWidth - dataWidth * scale) / 2
  const offsetY = padding + (drawHeight - dataHeight * scale) / 2

  function toCanvas(x: number, y: number): [number, number] {
    return [
      (x - minX) * scale + offsetX,
      (y - minY) * scale + offsetY,
    ]
  }

  // Draw connection lines between stars
  if (connections && connections.length > 0) {
    ctx.strokeStyle = 'rgba(126, 200, 227, 0.5)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([])

    for (const conn of connections) {
      const fromStar = stars[conn.from]
      const toStar = stars[conn.to]
      if (!fromStar || !toStar) continue

      const [x1, y1] = toCanvas(fromStar.x, fromStar.y)
      const [x2, y2] = toCanvas(toStar.x, toStar.y)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  // Draw star dots with glow effect
  for (const star of stars) {
    const [cx, cy] = toCanvas(star.x, star.y)
    const magnitude = star.magnitude ?? 3
    const radius = Math.max(2, 6 - magnitude)

    // Outer glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3)
    gradient.addColorStop(0, 'rgba(240, 240, 255, 0.6)')
    gradient.addColorStop(1, 'rgba(240, 240, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2)
    ctx.fill()

    // Star core
    ctx.fillStyle = '#f0f0ff'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ---------- Sub-component: Start Screen ----------

function StartScreen({
  difficulty,
  onSelectDifficulty,
  onStart,
}: {
  difficulty: Difficulty
  onSelectDifficulty: (d: Difficulty) => void
  onStart: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fadeIn">
      <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
        星座早押しクイズ
      </h1>
      <p className="text-star-white/60 mb-10 text-lg">
        星の並びから星座を当てよう！
      </p>

      {/* Difficulty selection */}
      <div className="mb-10 w-full max-w-md">
        <p className="text-center text-star-white/80 mb-4 text-sm font-semibold tracking-wide">
          難易度を選択
        </p>
        <div className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.key}
              onClick={() => onSelectDifficulty(d.key)}
              className={`rounded-xl py-3 px-2 text-center transition-all duration-200 border cursor-pointer ${
                difficulty === d.key
                  ? 'bg-nebula-purple/30 border-nebula-purple text-star-white shadow-lg shadow-nebula-purple/20'
                  : 'bg-white/5 border-white/10 text-star-white/70 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-lg font-bold">{d.label}</div>
              <div className="text-xs mt-1 opacity-70">{d.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button onClick={onStart} className="btn-primary text-lg px-10 py-4 animate-glow">
        スタート
      </button>

      <p className="text-star-white/40 text-sm mt-6">
        全{TOTAL_QUESTIONS}問 ・ コンボで高得点を目指そう
      </p>
    </div>
  )
}

// ---------- Sub-component: Timer Bar ----------

function TimerBar({ fraction }: { fraction: number }) {
  let barColor = 'bg-nebula-blue'
  if (fraction < 0.3) {
    barColor = 'bg-danger'
  } else if (fraction < 0.6) {
    barColor = 'bg-warning'
  }

  return (
    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-100 ease-linear ${barColor}`}
        style={{ width: `${Math.max(0, fraction * 100)}%` }}
      />
    </div>
  )
}

// ---------- Sub-component: Playing Screen ----------

function PlayingScreen({
  question,
  questionIndex,
  score,
  combo,
  timerFraction,
  feedbackState,
  selectedIndex,
  correctIndex,
  onSelect,
}: {
  question: QuizQuestion
  questionIndex: number
  score: number
  combo: number
  timerFraction: number
  feedbackState: 'none' | 'correct' | 'wrong'
  selectedIndex: number | null
  correctIndex: number
  onSelect: (index: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw constellation when question changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !question) return
    drawConstellation(canvas, question.constellation)

    const handleResize = () => {
      if (canvasRef.current) {
        drawConstellation(canvasRef.current, question.constellation)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [question])

  const disabled = feedbackState !== 'none'

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn">
      {/* HUD: Score, question counter, combo */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-star-white/80 text-sm font-semibold">
          スコア: <span className="text-star-gold">{score.toLocaleString()}</span>
        </div>
        <div className="text-star-white/60 text-sm font-semibold">
          Q.{questionIndex + 1} / {TOTAL_QUESTIONS}
        </div>
        <div className="text-sm font-semibold min-w-[100px] text-right">
          {combo >= 3 ? (
            <span className="text-star-gold animate-combo inline-block">
              🔥 {combo} combo!
            </span>
          ) : combo > 0 ? (
            <span className="text-star-white/70">{combo} combo</span>
          ) : (
            <span className="text-star-white/40">0 combo</span>
          )}
        </div>
      </div>

      {/* Timer bar */}
      <TimerBar fraction={timerFraction} />

      {/* Constellation canvas */}
      <div className="mt-4 mb-5 rounded-2xl overflow-hidden border border-white/10 bg-space-900/60">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ height: '280px' }}
        />
      </div>

      {/* Feedback overlay */}
      {feedbackState !== 'none' && (
        <div className="flex justify-center mb-4">
          {feedbackState === 'correct' ? (
            <div className="text-2xl font-bold text-success animate-combo">
              正解！
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="text-2xl font-bold text-danger animate-shake">
                不正解
              </div>
              <div className="text-star-white/60 text-sm">
                正解: {question.constellation.name}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2x2 choice grid */}
      <div className="grid grid-cols-2 gap-3">
        {question.choices.map((choice, i) => {
          let btnClass =
            'w-full py-4 px-3 rounded-xl text-center font-bold text-base transition-all duration-200 border cursor-pointer '

          if (feedbackState === 'none') {
            // Normal interactive state
            btnClass +=
              'bg-space-700/80 border-white/15 text-star-white hover:bg-space-600 hover:border-star-gold/40 active:scale-95'
          } else if (feedbackState === 'correct' && i === correctIndex) {
            // Correct answer highlighted green
            btnClass += 'bg-success/30 border-success text-success'
          } else if (feedbackState === 'wrong' && i === selectedIndex) {
            // Player's wrong selection highlighted red
            btnClass += 'bg-danger/30 border-danger text-danger animate-shake'
          } else if (feedbackState === 'wrong' && i === correctIndex) {
            // Show correct answer when player was wrong
            btnClass += 'bg-success/30 border-success text-success'
          } else {
            // Dimmed non-selected buttons during feedback
            btnClass += 'bg-space-700/40 border-white/5 text-star-white/40'
          }

          return (
            <button
              key={choice.id}
              disabled={disabled}
              onClick={() => onSelect(i)}
              className={btnClass}
            >
              {choice.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Sub-component: Result Screen ----------

function ResultScreen({
  results,
  totalScore,
  difficulty,
  onRestart,
}: {
  results: RoundResult[]
  totalScore: number
  difficulty: Difficulty
  onRestart: () => void
}) {
  const correctCount = results.filter((r) => r.correct).length
  const maxCombo = Math.max(0, ...results.map((r) => r.combo))
  const accuracy = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const starRating = getStarRating(accuracy)
  const diffLabel = DIFFICULTIES.find((d) => d.key === difficulty)?.label ?? ''

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fadeIn">
      <h2 className="text-3xl font-bold mb-2 text-star-white">クイズ結果</h2>
      <p className="text-star-white/50 mb-6 text-sm">難易度: {diffLabel}</p>

      {/* Star rating */}
      <div className="text-4xl mb-6 tracking-widest">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < starRating ? 'opacity-100' : 'opacity-20'}>
            ⭐
          </span>
        ))}
      </div>

      {/* Total score */}
      <div className="text-6xl font-bold bg-gradient-to-r from-star-gold to-star-blue bg-clip-text text-transparent mb-8">
        {totalScore.toLocaleString()}
        <span className="text-2xl text-star-white/60 ml-2">点</span>
      </div>

      {/* Stats table */}
      <div className="w-full max-w-sm bg-space-800/80 rounded-2xl border border-white/10 overflow-hidden mb-8">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-white/5">
              <td className="px-5 py-3 text-star-white/60">正解数</td>
              <td className="px-5 py-3 text-right font-bold text-star-white">
                {correctCount} / {results.length}
              </td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="px-5 py-3 text-star-white/60">正答率</td>
              <td className="px-5 py-3 text-right font-bold text-star-white">
                {accuracy}%
              </td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="px-5 py-3 text-star-white/60">最大コンボ</td>
              <td className="px-5 py-3 text-right font-bold text-star-gold">
                {maxCombo}
              </td>
            </tr>
            <tr>
              <td className="px-5 py-3 text-star-white/60">合計スコア</td>
              <td className="px-5 py-3 text-right font-bold text-star-gold">
                {totalScore.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Restart button */}
      <button onClick={onRestart} className="btn-primary text-lg px-10 py-4">
        もう一度
      </button>
    </div>
  )
}

// ========== Main SpeedQuiz Component ==========

export default function SpeedQuiz() {
  // --- Game state ---
  const [phase, setPhase] = useState<GamePhase>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])

  // --- Timer state ---
  const [timeRemaining, setTimeRemaining] = useState(0)
  const totalTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Feedback state ---
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'wrong'>('none')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for accessing latest state inside callbacks
  const questionsRef = useRef<QuizQuestion[]>([])
  const currentIndexRef = useRef(0)
  const comboRef = useRef(0)
  const resultsRef = useRef<RoundResult[]>([])
  const timeRemainingRef = useRef(0)
  const feedbackStateRef = useRef<'none' | 'correct' | 'wrong'>('none')

  // Keep refs in sync with state
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { comboRef.current = combo }, [combo])
  useEffect(() => { resultsRef.current = results }, [results])
  useEffect(() => { timeRemainingRef.current = timeRemaining }, [timeRemaining])
  useEffect(() => { feedbackStateRef.current = feedbackState }, [feedbackState])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  // Get time limit in seconds for current difficulty
  const getTimeLimit = useCallback((): number => {
    const d = DIFFICULTIES.find((opt) => opt.key === difficulty)
    return d ? d.time : 5
  }, [difficulty])

  // Advance to next question or show results
  const advanceToNext = useCallback(() => {
    const nextIndex = currentIndexRef.current + 1

    if (nextIndex >= TOTAL_QUESTIONS) {
      // Game over - show results
      setPhase('result')
      return
    }

    // Set up next round
    const timeLimit = getTimeLimit()
    const totalMs = timeLimit * 1000

    setCurrentIndex(nextIndex)
    setTimeRemaining(totalMs)
    totalTimeRef.current = totalMs
    setFeedbackState('none')
    setSelectedIndex(null)
    setPhase('playing')

    // Start a new timer for the next question
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, totalMs - elapsed)
      setTimeRemaining(remaining)
      timeRemainingRef.current = remaining

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null

        // Timeout: wrong answer
        setFeedbackState('wrong')
        feedbackStateRef.current = 'wrong'
        setSelectedIndex(null)

        const currentQ = questionsRef.current[currentIndexRef.current]
        if (currentQ) {
          const newResult: RoundResult = {
            question: currentQ,
            selectedIndex: null,
            correct: false,
            timeRemaining: 0,
            score: 0,
            combo: 0,
          }
          setResults((prev) => [...prev, newResult])
        }
        setCombo(0)
        comboRef.current = 0
        setPhase('feedback')

        feedbackTimerRef.current = setTimeout(() => {
          advanceToNext()
        }, 1500)
      }
    }, TIMER_TICK_MS)
  }, [getTimeLimit])

  // Start the game
  const handleStart = useCallback(() => {
    const qs = generateQuestions(TOTAL_QUESTIONS)
    const timeLimit = getTimeLimit()
    const totalMs = timeLimit * 1000

    setQuestions(qs)
    questionsRef.current = qs
    setCurrentIndex(0)
    currentIndexRef.current = 0
    setScore(0)
    setCombo(0)
    comboRef.current = 0
    setResults([])
    resultsRef.current = []
    setFeedbackState('none')
    feedbackStateRef.current = 'none'
    setSelectedIndex(null)
    setTimeRemaining(totalMs)
    timeRemainingRef.current = totalMs
    totalTimeRef.current = totalMs
    setPhase('playing')

    // Start countdown timer
    if (timerRef.current) clearInterval(timerRef.current)
    const startTime = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, totalMs - elapsed)
      setTimeRemaining(remaining)
      timeRemainingRef.current = remaining

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null

        // Timeout
        setFeedbackState('wrong')
        feedbackStateRef.current = 'wrong'
        setSelectedIndex(null)

        const currentQ = questionsRef.current[0]
        if (currentQ) {
          const newResult: RoundResult = {
            question: currentQ,
            selectedIndex: null,
            correct: false,
            timeRemaining: 0,
            score: 0,
            combo: 0,
          }
          setResults((prev) => [...prev, newResult])
        }
        setCombo(0)
        comboRef.current = 0
        setPhase('feedback')

        feedbackTimerRef.current = setTimeout(() => {
          advanceToNext()
        }, 1500)
      }
    }, TIMER_TICK_MS)
  }, [getTimeLimit, advanceToNext])

  // Handle player selecting an answer
  const handleSelect = useCallback(
    (index: number) => {
      if (feedbackStateRef.current !== 'none') return

      // Stop the countdown
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null

      const question = questionsRef.current[currentIndexRef.current]
      if (!question) return

      const isCorrect = index === question.correctIndex
      const currentTime = timeRemainingRef.current

      setSelectedIndex(index)

      if (isCorrect) {
        const newCombo = comboRef.current + 1
        const roundScore = calculateScore(currentTime, totalTimeRef.current, newCombo)

        setFeedbackState('correct')
        feedbackStateRef.current = 'correct'
        setScore((prev) => prev + roundScore)
        setCombo(newCombo)
        comboRef.current = newCombo
        setResults((prev) => [
          ...prev,
          {
            question,
            selectedIndex: index,
            correct: true,
            timeRemaining: currentTime,
            score: roundScore,
            combo: newCombo,
          },
        ])
      } else {
        setFeedbackState('wrong')
        feedbackStateRef.current = 'wrong'
        setCombo(0)
        comboRef.current = 0
        setResults((prev) => [
          ...prev,
          {
            question,
            selectedIndex: index,
            correct: false,
            timeRemaining: currentTime,
            score: 0,
            combo: 0,
          },
        ])
      }

      setPhase('feedback')

      feedbackTimerRef.current = setTimeout(
        () => {
          advanceToNext()
        },
        isCorrect ? 1000 : 1500,
      )
    },
    [advanceToNext],
  )

  // Restart: go back to start screen
  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    timerRef.current = null
    feedbackTimerRef.current = null
    setPhase('start')
    setQuestions([])
    setCurrentIndex(0)
    setScore(0)
    setCombo(0)
    setResults([])
    setFeedbackState('none')
    setSelectedIndex(null)
  }, [])

  // Timer fraction for bar display
  const timerFraction =
    totalTimeRef.current > 0 ? timeRemaining / totalTimeRef.current : 1

  // ---------- Render ----------

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {phase === 'start' && (
        <StartScreen
          difficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onStart={handleStart}
        />
      )}

      {(phase === 'playing' || phase === 'feedback') && questions[currentIndex] && (
        <PlayingScreen
          question={questions[currentIndex]}
          questionIndex={currentIndex}
          score={score}
          combo={combo}
          timerFraction={timerFraction}
          feedbackState={feedbackState}
          selectedIndex={selectedIndex}
          correctIndex={questions[currentIndex].correctIndex}
          onSelect={handleSelect}
        />
      )}

      {phase === 'result' && (
        <ResultScreen
          results={results}
          totalScore={score}
          difficulty={difficulty}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
