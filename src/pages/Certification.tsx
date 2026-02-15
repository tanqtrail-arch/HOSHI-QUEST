import { useState, useEffect, useRef, useCallback } from 'react'
import { constellations, getRandomConstellations, type Constellation } from '../data/constellations'

// ========== Types ==========

type Difficulty = 'beginner' | 'intermediate' | 'advanced'
type QuestionType = 'name' | 'mythology' | 'season' | 'brightStar' | 'latin' | 'feature'
type Phase = 'start' | 'playing' | 'result' | 'certificate'

interface Question {
  type: QuestionType
  questionText: string
  constellation: Constellation
  choices: string[]
  correctIndex: number
  drawPattern?: boolean
}

interface AnswerRecord {
  question: Question
  selectedIndex: number
  correct: boolean
}

const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string
  count: number
  timer: number | null
  types: QuestionType[]
  description: string
}> = {
  beginner: {
    label: '初級',
    count: 10,
    timer: null,
    types: ['name', 'season', 'latin'],
    description: '星座の名前と季節が中心。時間制限なし。',
  },
  intermediate: {
    label: '中級',
    count: 20,
    timer: 15,
    types: ['name', 'mythology', 'season', 'brightStar', 'latin', 'feature'],
    description: '全ジャンルから出題。1問15秒の制限付き。',
  },
  advanced: {
    label: '上級',
    count: 30,
    timer: 10,
    types: ['name', 'mythology', 'season', 'brightStar', 'latin', 'feature'],
    description: '全ジャンル・難問多数。1問10秒の制限付き。',
  },
}

const TYPE_LABELS: Record<QuestionType, string> = {
  name: '名前',
  mythology: '神話',
  season: '季節',
  brightStar: '一等星',
  latin: 'ラテン名',
  feature: '特徴',
}

const TYPE_COLORS: Record<QuestionType, string> = {
  name: 'bg-nebula-blue/20 text-nebula-blue border-nebula-blue/40',
  mythology: 'bg-nebula-purple/20 text-nebula-purple border-nebula-purple/40',
  season: 'bg-success/20 text-success border-success/40',
  brightStar: 'bg-star-gold/20 text-star-gold border-star-gold/40',
  latin: 'bg-star-blue/20 text-star-blue border-star-blue/40',
  feature: 'bg-warning/20 text-warning border-warning/40',
}

const SEASONS = ['春', '夏', '秋', '冬'] as const

// ========== Utility ==========

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count)
}

// ========== Canvas Drawing ==========

function drawConstellation(canvas: HTMLCanvasElement, constellation: Constellation) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  // Draw connections
  ctx.strokeStyle = 'rgba(126, 200, 227, 0.4)'
  ctx.lineWidth = 1.5
  constellation.connections.forEach(conn => {
    const from = constellation.stars[conn.from]
    const to = constellation.stars[conn.to]
    ctx.beginPath()
    ctx.moveTo(from.x * width / 100, from.y * height / 100)
    ctx.lineTo(to.x * width / 100, to.y * height / 100)
    ctx.stroke()
  })

  // Draw stars
  constellation.stars.forEach(star => {
    const size = Math.max(2, 6 - star.magnitude)
    const sx = star.x * width / 100
    const sy = star.y * height / 100
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fillStyle = star.magnitude <= 2 ? '#ffd700' : '#f0f0ff'
    ctx.fill()

    // Glow
    ctx.beginPath()
    ctx.arc(sx, sy, size * 2, 0, Math.PI * 2)
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2)
    g.addColorStop(0, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.fill()
  })
}

function StarPattern({
  constellation,
  width,
  height,
  className = '',
}: {
  constellation: Constellation
  width: number
  height: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = width
    canvas.height = height
    drawConstellation(canvas, constellation)
  }, [constellation, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  )
}

// ========== Question Generation ==========

function generateDistractors(
  correct: Constellation,
  pool: Constellation[],
  count: number,
  sameSeasonBias: boolean
): Constellation[] {
  const others = pool.filter(c => c.id !== correct.id)

  if (sameSeasonBias) {
    // For advanced: prefer distractors from the same season for harder questions
    const sameSeason = others.filter(c => c.season === correct.season)
    const diffSeason = others.filter(c => c.season !== correct.season)
    const picked = shuffle(sameSeason).slice(0, count)
    if (picked.length < count) {
      picked.push(...shuffle(diffSeason).slice(0, count - picked.length))
    }
    return picked.slice(0, count)
  }

  return shuffle(others).slice(0, count)
}

function createChoices(correct: string, distractorValues: string[]): { choices: string[]; correctIndex: number } {
  const allChoices = shuffle([correct, ...distractorValues])
  return {
    choices: allChoices,
    correctIndex: allChoices.indexOf(correct),
  }
}

function generateQuestion(
  type: QuestionType,
  correct: Constellation,
  pool: Constellation[],
  hard: boolean
): Question | null {
  const distractors = generateDistractors(correct, pool, 3, hard)
  if (distractors.length < 3) return null

  switch (type) {
    case 'name': {
      const { choices, correctIndex } = createChoices(
        correct.name,
        distractors.map(d => d.name)
      )
      return {
        type: 'name',
        questionText: 'この星座の名前は？',
        constellation: correct,
        choices,
        correctIndex,
        drawPattern: true,
      }
    }

    case 'mythology': {
      // Truncate mythology to a reasonable excerpt
      const excerpt = correct.mythology.length > 80
        ? correct.mythology.slice(0, 80) + '…'
        : correct.mythology
      const { choices, correctIndex } = createChoices(
        correct.name,
        distractors.map(d => d.name)
      )
      return {
        type: 'mythology',
        questionText: `「${excerpt}」\nどの星座の神話？`,
        constellation: correct,
        choices,
        correctIndex,
      }
    }

    case 'season': {
      const { choices, correctIndex } = createChoices(
        correct.season,
        // Use the four seasons as distractors, removing the correct one
        SEASONS.filter(s => s !== correct.season).slice(0, 3)
      )
      return {
        type: 'season',
        questionText: `「${correct.name}」が見える季節は？`,
        constellation: correct,
        choices,
        correctIndex,
      }
    }

    case 'brightStar': {
      if (!correct.brightestStar || correct.brightestStar === 'なし') return null
      const validDistractors = distractors.filter(d => d.brightestStar && d.brightestStar !== 'なし')
      if (validDistractors.length < 3) return null
      const { choices, correctIndex } = createChoices(
        correct.name,
        validDistractors.slice(0, 3).map(d => d.name)
      )
      return {
        type: 'brightStar',
        questionText: `「${correct.brightestStar}」はどの星座の一等星？`,
        constellation: correct,
        choices,
        correctIndex,
      }
    }

    case 'latin': {
      const { choices, correctIndex } = createChoices(
        correct.name,
        distractors.map(d => d.name)
      )
      return {
        type: 'latin',
        questionText: `ラテン名「${correct.latin}」の星座は？`,
        constellation: correct,
        choices,
        correctIndex,
      }
    }

    case 'feature': {
      // Use findingTip or a keyword as the hint
      const useKeyword = correct.keywords.length > 0 && Math.random() > 0.5
      const hint = useKeyword
        ? correct.keywords[Math.floor(Math.random() * correct.keywords.length)]
        : (correct.findingTip.length > 60
          ? correct.findingTip.slice(0, 60) + '…'
          : correct.findingTip)
      const { choices, correctIndex } = createChoices(
        correct.name,
        distractors.map(d => d.name)
      )
      return {
        type: 'feature',
        questionText: useKeyword
          ? `「${hint}」といえば、どの星座？`
          : `「${hint}」\nこの特徴を持つ星座は？`,
        constellation: correct,
        choices,
        correctIndex,
      }
    }

    default:
      return null
  }
}

function generateQuestionSet(difficulty: Difficulty): Question[] {
  const config = DIFFICULTY_CONFIG[difficulty]
  const pool = [...constellations]
  const questions: Question[] = []
  const usedConstellations = new Set<string>()
  const hard = difficulty === 'advanced'

  // Select constellations for questions - try to use unique ones
  const selectedConstellations = shuffle(pool)

  let attempts = 0
  const maxAttempts = config.count * 5

  while (questions.length < config.count && attempts < maxAttempts) {
    attempts++

    // Pick a type randomly from the allowed types
    const type = config.types[Math.floor(Math.random() * config.types.length)]

    // Pick a constellation, preferring unused ones
    let target: Constellation | undefined
    for (const c of selectedConstellations) {
      if (!usedConstellations.has(c.id)) {
        target = c
        break
      }
    }
    // If all used, just pick a random one
    if (!target) {
      target = selectedConstellations[Math.floor(Math.random() * selectedConstellations.length)]
    }

    const question = generateQuestion(type, target, pool, hard)
    if (question) {
      questions.push(question)
      usedConstellations.add(target.id)
    }
  }

  return questions
}

// ========== Components ==========

function TimerBar({
  timeLeft,
  maxTime,
}: {
  timeLeft: number
  maxTime: number
}) {
  const percentage = (timeLeft / maxTime) * 100
  const isLow = timeLeft <= 3

  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 linear ${
          isLow ? 'bg-danger' : 'bg-gradient-to-r from-star-blue to-star-gold'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function StarRating({ percentage }: { percentage: number }) {
  const starCount = percentage >= 100 ? 5
    : percentage >= 90 ? 5
    : percentage >= 80 ? 4
    : percentage >= 70 ? 3
    : percentage >= 50 ? 2
    : 1

  return (
    <div className="flex justify-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`text-3xl transition-all duration-300 ${
            i <= starCount ? 'text-star-gold' : 'text-white/15'
          }`}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationFillMode: 'both',
          }}
        >
          &#9733;
        </span>
      ))}
    </div>
  )
}

// ========== Main Component ==========

export default function Certification() {
  // Phase state
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner')

  // Game state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const config = DIFFICULTY_CONFIG[difficulty]
  const currentQuestion = questions[currentIndex] ?? null
  const totalQuestions = questions.length

  // ---------- Timer logic ----------

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleTimeUp = useCallback(() => {
    stopTimer()
    if (currentQuestion && !showFeedback) {
      // Time's up - mark as wrong
      setShowFeedback(true)
      setSelectedIndex(-1) // no selection
      setAnswers(prev => [...prev, {
        question: currentQuestion,
        selectedIndex: -1,
        correct: false,
      }])
      // Auto-advance
      autoAdvanceRef.current = setTimeout(() => {
        advanceToNext()
      }, 1500)
    }
  }, [currentQuestion, showFeedback, stopTimer])

  const startTimer = useCallback(() => {
    if (!config.timer) return
    setTimeLeft(config.timer)
    stopTimer()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [config.timer, stopTimer])

  // Watch for time hitting 0
  useEffect(() => {
    if (config.timer && timeLeft === 0 && phase === 'playing' && !showFeedback) {
      handleTimeUp()
    }
  }, [timeLeft, config.timer, phase, showFeedback, handleTimeUp])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTimer()
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current)
      }
    }
  }, [stopTimer])

  // ---------- Game actions ----------

  function startGame() {
    const qs = generateQuestionSet(difficulty)
    setQuestions(qs)
    setCurrentIndex(0)
    setAnswers([])
    setSelectedIndex(null)
    setShowFeedback(false)
    setScore(0)
    setPhase('playing')
    if (config.timer) {
      // Timer will start via effect
    }
  }

  // Start timer when entering a new question
  useEffect(() => {
    if (phase === 'playing' && !showFeedback && config.timer) {
      startTimer()
    }
    return () => stopTimer()
  }, [currentIndex, phase, showFeedback, config.timer, startTimer, stopTimer])

  function handleAnswer(index: number) {
    if (showFeedback || selectedIndex !== null) return
    if (!currentQuestion) return

    stopTimer()
    setSelectedIndex(index)
    setShowFeedback(true)

    const isCorrect = index === currentQuestion.correctIndex
    if (isCorrect) {
      setScore(prev => prev + 1)
    }

    setAnswers(prev => [...prev, {
      question: currentQuestion,
      selectedIndex: index,
      correct: isCorrect,
    }])

    // Auto-advance after delay
    autoAdvanceRef.current = setTimeout(() => {
      advanceToNext()
    }, 1500)
  }

  function advanceToNext() {
    const nextIdx = currentIndex + 1
    if (nextIdx >= totalQuestions) {
      setPhase('result')
    } else {
      setCurrentIndex(nextIdx)
      setSelectedIndex(null)
      setShowFeedback(false)
    }
  }

  function goToCertificate() {
    setPhase('certificate')
  }

  function resetGame() {
    setPhase('start')
    setQuestions([])
    setAnswers([])
    setScore(0)
    setCurrentIndex(0)
    setSelectedIndex(null)
    setShowFeedback(false)
    stopTimer()
  }

  // ---------- Stats calculation ----------

  function getTypeStats(): Record<QuestionType, { total: number; correct: number }> {
    const stats: Record<QuestionType, { total: number; correct: number }> = {
      name: { total: 0, correct: 0 },
      mythology: { total: 0, correct: 0 },
      season: { total: 0, correct: 0 },
      brightStar: { total: 0, correct: 0 },
      latin: { total: 0, correct: 0 },
      feature: { total: 0, correct: 0 },
    }
    answers.forEach(a => {
      stats[a.question.type].total++
      if (a.correct) stats[a.question.type].correct++
    })
    return stats
  }

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0
  const passed = percentage >= 70

  // ========== Start Screen ==========

  if (phase === 'start') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星座検定チャレンジ
          </h1>
          <p className="text-star-white/60 text-sm">
            星座の知識を総合的に試す認定試験
          </p>
        </div>

        {/* Difficulty selection */}
        <div className="space-y-3 mb-8">
          {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG[Difficulty]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                  difficulty === key
                    ? 'bg-star-gold/10 border-star-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-lg font-bold ${
                    difficulty === key ? 'text-star-gold' : 'text-star-white'
                  }`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-star-white/40">
                    {cfg.count}問 {cfg.timer ? `/ ${cfg.timer}秒制限` : '/ 時間制限なし'}
                  </span>
                </div>
                <p className="text-xs text-star-white/50">{cfg.description}</p>
              </button>
            )
          )}
        </div>

        {/* Exam rules */}
        <div className="game-card mb-8">
          <h2 className="text-sm font-bold text-star-white/70 mb-3">受験ルール</h2>
          <ul className="space-y-2 text-xs text-star-white/50">
            <li className="flex items-start gap-2">
              <span className="text-star-gold mt-0.5">&#9670;</span>
              <span>名前・神話・季節・一等星・ラテン名・特徴の6ジャンルから出題</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-star-gold mt-0.5">&#9670;</span>
              <span>4択から正しい答えを選んでください</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-star-gold mt-0.5">&#9670;</span>
              <span>70%以上で合格 &#8212; 認定証が発行されます</span>
            </li>
          </ul>
        </div>

        <button
          onClick={startGame}
          className="btn-primary w-full text-lg py-4"
        >
          受験開始
        </button>
      </div>
    )
  }

  // ========== Playing Screen ==========

  if (phase === 'playing' && currentQuestion) {
    const progressPercent = ((currentIndex) / totalQuestions) * 100

    return (
      <div className="max-w-lg mx-auto px-4 py-6 animate-fadeIn">
        {/* Header: progress + score */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-star-white/70">
              第 {currentIndex + 1} 問 / {totalQuestions} 問
            </span>
            <span className="text-sm text-star-gold font-bold">
              {score} 点
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-star-blue to-star-gold rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer bar */}
        {config.timer && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-star-white/40">残り時間</span>
              <span className={`text-xs font-bold ${
                timeLeft <= 3 ? 'text-danger' : 'text-star-white/60'
              }`}>
                {timeLeft}秒
              </span>
            </div>
            <TimerBar timeLeft={timeLeft} maxTime={config.timer} />
          </div>
        )}

        {/* Question type badge */}
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${TYPE_COLORS[currentQuestion.type]}`}>
            {TYPE_LABELS[currentQuestion.type]}
          </span>
        </div>

        {/* Star pattern (for name-type questions) */}
        {currentQuestion.drawPattern && (
          <div className="flex justify-center mb-4">
            <div className="rounded-xl bg-space-900/60 p-4 border border-white/5">
              <StarPattern
                constellation={currentQuestion.constellation}
                width={240}
                height={200}
              />
            </div>
          </div>
        )}

        {/* Question text */}
        <div className="game-card mb-6" style={{ cursor: 'default' }}>
          <p className="text-base text-star-white font-bold leading-relaxed whitespace-pre-line">
            {currentQuestion.questionText}
          </p>
        </div>

        {/* Choices */}
        <div className="space-y-3 mb-6">
          {currentQuestion.choices.map((choice, i) => {
            let btnClass = 'w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer '

            if (showFeedback) {
              if (i === currentQuestion.correctIndex) {
                btnClass += 'bg-success/20 border-success/60 text-success'
              } else if (i === selectedIndex && i !== currentQuestion.correctIndex) {
                btnClass += 'bg-danger/20 border-danger/60 text-danger'
              } else {
                btnClass += 'bg-white/5 border-white/10 text-star-white/30'
              }
            } else {
              btnClass += 'bg-white/5 border-white/10 text-star-white hover:bg-white/10 hover:border-white/20 active:scale-[0.98]'
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showFeedback}
                className={btnClass}
              >
                <span className="text-sm font-bold">
                  {choice}
                </span>
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div className={`text-center py-3 rounded-xl mb-4 animate-fadeIn ${
            selectedIndex === currentQuestion.correctIndex
              ? 'bg-success/10 border border-success/30'
              : 'bg-danger/10 border border-danger/30'
          }`}>
            {selectedIndex === currentQuestion.correctIndex ? (
              <p className="text-success font-bold text-lg">&#9675; 正解！</p>
            ) : (
              <div>
                <p className="text-danger font-bold text-lg">&#10005; 不正解</p>
                <p className="text-star-white/60 text-sm mt-1">
                  正解: {currentQuestion.choices[currentQuestion.correctIndex]}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ========== Result Screen ==========

  if (phase === 'result') {
    const typeStats = getTypeStats()

    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4 text-star-white">
            試験終了
          </h1>
          <div className={`text-6xl font-bold mb-2 ${passed ? 'text-star-gold' : 'text-danger'}`}>
            {percentage}%
          </div>
          <p className={`text-xl font-bold mb-4 ${passed ? 'text-success' : 'text-danger'}`}>
            {passed ? '合格！' : '不合格'}
          </p>
          <StarRating percentage={percentage} />
          <p className="text-star-white/50 text-sm mt-4">
            {score} / {totalQuestions} 問正解
          </p>
        </div>

        {/* Stats by type */}
        <div className="game-card mb-6" style={{ cursor: 'default' }}>
          <h2 className="text-sm font-bold text-star-white/70 mb-4">ジャンル別成績</h2>
          <div className="space-y-3">
            {(Object.entries(typeStats) as [QuestionType, { total: number; correct: number }][])
              .filter(([, stats]) => stats.total > 0)
              .map(([type, stats]) => {
                const typePercent = stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : 0
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_COLORS[type]} min-w-[52px] text-center`}>
                      {TYPE_LABELS[type]}
                    </span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          typePercent >= 70 ? 'bg-success' : typePercent >= 40 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${typePercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-star-white/60 min-w-[48px] text-right">
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Wrong answers review */}
        {answers.filter(a => !a.correct).length > 0 && (
          <div className="game-card mb-6" style={{ cursor: 'default' }}>
            <h2 className="text-sm font-bold text-star-white/70 mb-3">間違えた問題</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {answers.filter(a => !a.correct).map((a, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-white/5 last:border-0">
                  <span className="text-danger text-xs mt-0.5">&#10005;</span>
                  <div className="flex-1">
                    <p className="text-xs text-star-white/60 truncate">
                      {a.question.questionText.split('\n')[0]}
                    </p>
                    <p className="text-xs text-success">
                      正解: {a.question.choices[a.question.correctIndex]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {passed && (
            <button
              onClick={goToCertificate}
              className="btn-primary flex-1 py-3"
            >
              認定証を見る
            </button>
          )}
          <button
            onClick={resetGame}
            className={`${passed ? 'btn-secondary' : 'btn-primary'} flex-1 py-3`}
          >
            {passed ? 'もう一度' : '再挑戦'}
          </button>
        </div>
      </div>
    )
  }

  // ========== Certificate Screen ==========

  if (phase === 'certificate') {
    const today = new Date()
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

    return (
      <div className="max-w-xl mx-auto px-4 py-12 animate-fadeIn">
        {/* Certificate card */}
        <div
          className="relative rounded-2xl p-1 mb-8"
          style={{
            background: 'linear-gradient(135deg, #ffd700, #daa520, #ffd700, #b8860b, #ffd700)',
          }}
        >
          {/* Inner border */}
          <div
            className="rounded-xl p-1"
            style={{
              background: 'linear-gradient(135deg, #0f0f2e, #1a1a3e)',
            }}
          >
            {/* Second gold border */}
            <div
              className="rounded-lg p-0.5"
              style={{
                background: 'linear-gradient(135deg, #ffd700, #daa520, #ffd700)',
              }}
            >
              {/* Certificate body */}
              <div
                className="rounded-lg px-8 py-10 text-center"
                style={{
                  background: 'linear-gradient(180deg, #0f0f2e 0%, #1a1a3e 50%, #0f0f2e 100%)',
                }}
              >
                {/* Decorative top stars */}
                <div className="flex justify-center gap-2 mb-4">
                  <span className="text-star-gold text-sm">&#9733;</span>
                  <span className="text-star-gold text-lg">&#9733;</span>
                  <span className="text-star-gold text-xl">&#9733;</span>
                  <span className="text-star-gold text-lg">&#9733;</span>
                  <span className="text-star-gold text-sm">&#9733;</span>
                </div>

                {/* Title */}
                <h1
                  className="text-2xl font-bold mb-1 tracking-widest"
                  style={{
                    background: 'linear-gradient(180deg, #ffd700, #daa520)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  星座検定 認定証
                </h1>

                {/* Decorative line */}
                <div className="flex justify-center items-center gap-3 my-4">
                  <div className="w-16 h-px bg-gradient-to-r from-transparent to-star-gold/50" />
                  <span className="text-star-gold text-xs">&#9670;</span>
                  <div className="w-16 h-px bg-gradient-to-l from-transparent to-star-gold/50" />
                </div>

                {/* Level */}
                <div className="mb-6">
                  <span className="inline-block px-6 py-2 rounded-full text-lg font-bold border-2 border-star-gold/60 text-star-gold bg-star-gold/10">
                    {config.label}
                  </span>
                </div>

                {/* Passed statement */}
                <p className="text-star-white/70 text-sm mb-6">
                  星座に関する総合的な知識を有することを認定します
                </p>

                {/* Score */}
                <div className="mb-6">
                  <div className="text-5xl font-bold text-star-gold mb-2">
                    {score}<span className="text-2xl text-star-white/40"> / {totalQuestions}</span>
                  </div>
                  <div className="text-lg font-bold text-success">
                    正答率 {percentage}%
                  </div>
                </div>

                {/* Star rating */}
                <div className="mb-6">
                  <StarRating percentage={percentage} />
                </div>

                {/* Pass badge */}
                <div className="inline-block px-8 py-2 rounded-full text-lg font-bold bg-success/20 text-success border border-success/40 mb-6">
                  合格
                </div>

                {/* Date */}
                <div className="mt-4">
                  <p className="text-xs text-star-white/40">認定日</p>
                  <p className="text-sm text-star-white/70 font-bold">{dateStr}</p>
                </div>

                {/* Decorative bottom stars */}
                <div className="flex justify-center gap-2 mt-6">
                  <span className="text-star-gold text-sm">&#9733;</span>
                  <span className="text-star-gold text-lg">&#9733;</span>
                  <span className="text-star-gold text-xl">&#9733;</span>
                  <span className="text-star-gold text-lg">&#9733;</span>
                  <span className="text-star-gold text-sm">&#9733;</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Type breakdown under certificate */}
        <div className="game-card mb-6" style={{ cursor: 'default' }}>
          <h2 className="text-sm font-bold text-star-white/70 mb-4">ジャンル別成績</h2>
          <div className="space-y-3">
            {(Object.entries(getTypeStats()) as [QuestionType, { total: number; correct: number }][])
              .filter(([, stats]) => stats.total > 0)
              .map(([type, stats]) => {
                const typePercent = stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : 0
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${TYPE_COLORS[type]} min-w-[52px] text-center`}>
                      {TYPE_LABELS[type]}
                    </span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          typePercent >= 70 ? 'bg-success' : typePercent >= 40 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${typePercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-star-white/60 min-w-[48px] text-right">
                      {stats.correct}/{stats.total}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={resetGame}
            className="btn-secondary flex-1 py-3"
          >
            トップに戻る
          </button>
          <button
            onClick={startGame}
            className="btn-primary flex-1 py-3"
          >
            もう一度受験
          </button>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
