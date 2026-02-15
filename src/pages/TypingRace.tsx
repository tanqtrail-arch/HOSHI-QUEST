import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { constellations, type Constellation } from '../data/constellations'

// ---------------------------------------------------------------------------
// Answer matching helpers
// ---------------------------------------------------------------------------

function normalizeAnswer(input: string): string {
  return input
    .trim()
    .replace(/[\u3041-\u3096]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60),
    ) // hiragana -> katakana
    .replace(/座$/, '')
    .replace(/\s/g, '')
}

function checkAnswer(input: string, constellation: Constellation): boolean {
  const normalized = normalizeAnswer(input)
  const correctName = constellation.name.replace(/座$/, '')
  return normalized === correctName
}

// ---------------------------------------------------------------------------
// Clue generation
// ---------------------------------------------------------------------------

type ClueKind = 'hint' | 'findingTip' | 'starPattern'

interface Clue {
  kind: ClueKind
  text?: string
  constellation: Constellation
}

function pickClueKind(c: Constellation): ClueKind {
  const options: ClueKind[] = ['hint', 'findingTip']
  if (c.stars && c.stars.length > 0) {
    options.push('starPattern')
  }
  return options[Math.floor(Math.random() * options.length)]
}

function buildClue(c: Constellation): Clue {
  const kind = pickClueKind(c)

  if (kind === 'hint') {
    return {
      kind,
      text: `季節：${c.season}　／　最も明るい星：${c.brightestStar}`,
      constellation: c,
    }
  }

  if (kind === 'findingTip') {
    return {
      kind,
      text: c.findingTip,
      constellation: c,
    }
  }

  // starPattern
  return { kind: 'starPattern', constellation: c }
}

// ---------------------------------------------------------------------------
// Tiny star-pattern canvas
// ---------------------------------------------------------------------------

function StarPatternCanvas({
  constellation,
}: {
  constellation: Constellation
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const { stars, connections } = constellation

    if (!stars || stars.length === 0) return

    // Compute bounding box
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (const s of stars) {
      if (s.x < minX) minX = s.x
      if (s.x > maxX) maxX = s.x
      if (s.y < minY) minY = s.y
      if (s.y > maxY) maxY = s.y
    }

    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const pad = 30
    const scaleX = (w - pad * 2) / rangeX
    const scaleY = (h - pad * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)

    const offsetX = (w - rangeX * scale) / 2
    const offsetY = (h - rangeY * scale) / 2

    function tx(x: number) {
      return (x - minX) * scale + offsetX
    }
    function ty(y: number) {
      return (y - minY) * scale + offsetY
    }

    // Background
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, w, h)

    // Connections
    if (connections) {
      ctx.strokeStyle = 'rgba(126, 200, 227, 0.5)'
      ctx.lineWidth = 1.5
      for (const { from: a, to: b } of connections) {
        const sa = stars[a]
        const sb = stars[b]
        if (!sa || !sb) continue
        ctx.beginPath()
        ctx.moveTo(tx(sa.x), ty(sa.y))
        ctx.lineTo(tx(sb.x), ty(sb.y))
        ctx.stroke()
      }
    }

    // Stars
    for (const s of stars) {
      const r = s.magnitude ? Math.max(2, 5 - s.magnitude) : 3
      const sx = tx(s.x)
      const sy = ty(s.y)

      // glow
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3)
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(sx, sy, r * 3, 0, Math.PI * 2)
      ctx.fill()

      // core
      ctx.fillStyle = '#f0f0ff'
      ctx.beginPath()
      ctx.arc(sx, sy, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [constellation])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={200}
      className="rounded-lg mx-auto"
      style={{ background: '#0a0a1a' }}
    />
  )
}

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_QUESTIONS = 15
const MAX_ATTEMPTS = 3

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type GamePhase = 'start' | 'playing' | 'result'

export default function TypingRace() {
  // ---- game state ----
  const [phase, setPhase] = useState<GamePhase>('start')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [clue, setClue] = useState<Clue | null>(null)
  const [input, setInput] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [correctCount, setCorrectCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [feedback, setFeedback] = useState<
    'correct' | 'wrong' | 'revealed' | null
  >(null)
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null)

  // ---- timer ----
  const [startTime, setStartTime] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- input ref ----
  const inputRef = useRef<HTMLInputElement>(null)

  // ---- question pool (shuffled subset) ----
  const questionPool = useMemo(() => {
    const shuffled = [...constellations].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, TOTAL_QUESTIONS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ---- start timer ----
  const startTimer = useCallback(() => {
    const now = Date.now()
    setStartTime(now)
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - now)
    }, 200)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ---- cleanup on unmount ----
  useEffect(() => {
    return () => stopTimer()
  }, [stopTimer])

  // ---- load clue for current question ----
  const loadQuestion = useCallback(
    (idx: number) => {
      if (idx >= TOTAL_QUESTIONS) {
        stopTimer()
        setElapsed(Date.now() - startTime)
        setPhase('result')
        return
      }
      const c = questionPool[idx]
      setClue(buildClue(c))
      setInput('')
      setAttemptsLeft(MAX_ATTEMPTS)
      setFeedback(null)
      setRevealedAnswer(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    },
    [questionPool, startTime, stopTimer],
  )

  // ---- start game ----
  const handleStart = useCallback(() => {
    setPhase('playing')
    setQuestionIndex(0)
    setCorrectCount(0)
    setSkippedCount(0)
    setFeedback(null)
    startTimer()
  }, [startTimer])

  // When phase becomes 'playing' or questionIndex changes, load the clue
  useEffect(() => {
    if (phase === 'playing') {
      loadQuestion(questionIndex)
    }
  }, [phase, questionIndex, loadQuestion])

  // ---- advance to next ----
  const goNext = useCallback(() => {
    setQuestionIndex((prev) => prev + 1)
  }, [])

  // ---- submit answer ----
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!clue || feedback === 'correct' || feedback === 'revealed') return

      if (checkAnswer(input, clue.constellation)) {
        setFeedback('correct')
        setCorrectCount((c) => c + 1)
        setTimeout(goNext, 1200)
      } else {
        setFeedback('wrong')
        const remaining = attemptsLeft - 1
        setAttemptsLeft(remaining)

        if (remaining <= 0) {
          // reveal answer
          setRevealedAnswer(clue.constellation.name)
          setFeedback('revealed')
          setTimeout(goNext, 2000)
        } else {
          // clear wrong feedback after animation
          setTimeout(() => {
            setFeedback(null)
            setInput('')
            inputRef.current?.focus()
          }, 600)
        }
      }
    },
    [clue, input, feedback, attemptsLeft, goNext],
  )

  // ---- skip ----
  const handleSkip = useCallback(() => {
    if (!clue || feedback === 'correct' || feedback === 'revealed') return
    setSkippedCount((c) => c + 1)
    setRevealedAnswer(clue.constellation.name)
    setFeedback('revealed')
    setTimeout(goNext, 1800)
  }, [clue, feedback, goNext])

  // ---- derived values for result screen ----
  const accuracy =
    TOTAL_QUESTIONS > 0
      ? Math.round((correctCount / TOTAL_QUESTIONS) * 100)
      : 0
  const avgTime =
    TOTAL_QUESTIONS > 0 ? Math.round(elapsed / TOTAL_QUESTIONS / 1000) : 0

  // ---- compute score (0-1000) ----
  const score = useMemo(() => {
    const accScore = (correctCount / TOTAL_QUESTIONS) * 600
    const secs = elapsed / 1000
    const speedRatio = Math.max(0, Math.min(1, (180 - secs) / 150))
    const spdScore = speedRatio * 400
    return Math.round(accScore + spdScore)
  }, [correctCount, elapsed])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // ---- Start screen ----
  if (phase === 'start') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-fadeIn">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星座タイピングレース
          </h1>
          <p className="text-star-white/50 text-lg">
            ヒントから星座名をタイピングで答えよう！
          </p>
        </div>

        {/* Rules card */}
        <div className="game-card mb-10">
          <h2 className="text-lg font-bold text-star-gold mb-4">遊び方</h2>
          <ul className="space-y-3 text-star-white/70 text-sm leading-relaxed">
            <li className="flex gap-3">
              <span className="text-star-blue flex-shrink-0">▸</span>
              ヒント（季節・明るい星、見つけ方、星の並び）が表示されます
            </li>
            <li className="flex gap-3">
              <span className="text-star-blue flex-shrink-0">▸</span>
              星座の名前をひらがな or カタカナで入力してください
            </li>
            <li className="flex gap-3">
              <span className="text-star-blue flex-shrink-0">▸</span>
              「座」は付けても付けなくてもOKです（例：おりおん / オリオン座）
            </li>
            <li className="flex gap-3">
              <span className="text-star-blue flex-shrink-0">▸</span>
              間違えると最大3回まで再挑戦できます。3回失敗で答えが表示されます
            </li>
            <li className="flex gap-3">
              <span className="text-star-blue flex-shrink-0">▸</span>
              全{TOTAL_QUESTIONS}問！正確さとスピードでスコアが決まります
            </li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            className="btn-primary text-lg px-10 py-4"
          >
            スタート
          </button>
        </div>
      </div>
    )
  }

  // ---- Result screen ----
  if (phase === 'result') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            結果発表
          </h1>
          <p className="text-star-white/50">星座タイピングレース完了！</p>
        </div>

        {/* Score */}
        <div className="text-center mb-10">
          <p className="text-star-white/50 text-sm mb-1">スコア</p>
          <p className="text-6xl font-bold text-star-gold">{score}</p>
          <p className="text-star-white/40 text-sm mt-1">/ 1000</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="game-card text-center py-6">
            <p className="text-star-white/50 text-xs mb-2">所要時間</p>
            <p className="text-2xl font-bold text-star-blue">
              {formatTime(elapsed)}
            </p>
          </div>
          <div className="game-card text-center py-6">
            <p className="text-star-white/50 text-xs mb-2">正解数</p>
            <p className="text-2xl font-bold text-success">
              {correctCount}
              <span className="text-base text-star-white/40">
                {' '}
                / {TOTAL_QUESTIONS}
              </span>
            </p>
          </div>
          <div className="game-card text-center py-6">
            <p className="text-star-white/50 text-xs mb-2">正答率</p>
            <p className="text-2xl font-bold text-star-gold">{accuracy}%</p>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="game-card text-center py-4">
            <p className="text-star-white/50 text-xs mb-1">平均回答時間</p>
            <p className="text-lg font-bold text-star-white">
              {avgTime}秒 / 問
            </p>
          </div>
          <div className="game-card text-center py-4">
            <p className="text-star-white/50 text-xs mb-1">スキップ数</p>
            <p className="text-lg font-bold text-star-white">{skippedCount}</p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleStart}
            className="btn-primary text-lg px-10 py-4"
          >
            もう一度挑戦する
          </button>
        </div>
      </div>
    )
  }

  // ---- Playing screen ----
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header bar: progress + timer */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-star-white/60 text-sm font-bold">
          第 {questionIndex + 1} 問 / {TOTAL_QUESTIONS}問
        </p>
        <p className="text-star-blue font-mono text-lg font-bold tabular-nums">
          {formatTime(elapsed)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/10 mb-8 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-star-blue to-star-gold transition-all duration-500 ease-out"
          style={{
            width: `${(questionIndex / TOTAL_QUESTIONS) * 100}%`,
          }}
        />
      </div>

      {/* Clue card */}
      {clue && (
        <div className="game-card mb-8 min-h-[140px] flex flex-col items-center justify-center">
          <p className="text-star-white/40 text-xs mb-3 tracking-wider uppercase">
            ヒント
          </p>

          {clue.kind === 'starPattern' ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-star-white/50 text-sm mb-2">
                この星の並びは何座？
              </p>
              <StarPatternCanvas constellation={clue.constellation} />
            </div>
          ) : (
            <p className="text-star-white text-center text-lg leading-relaxed px-4">
              {clue.text}
            </p>
          )}
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={feedback === 'correct' || feedback === 'revealed'}
            placeholder="星座名を入力..."
            autoComplete="off"
            className={[
              'w-full bg-transparent text-center text-2xl font-bold py-4 outline-none border-b-2 transition-all duration-300 placeholder:text-star-white/20',
              feedback === 'correct'
                ? 'border-success text-success'
                : feedback === 'wrong'
                  ? 'border-danger text-danger animate-shake'
                  : 'border-star-white/20 text-star-white focus:border-star-gold',
              feedback === 'correct'
                ? 'shadow-[0_4px_20px_rgba(46,204,113,0.3)]'
                : '',
            ].join(' ')}
          />

          {/* Correct feedback */}
          {feedback === 'correct' && (
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-success font-bold text-lg animate-fadeIn">
              正解！
            </p>
          )}

          {/* Revealed answer */}
          {feedback === 'revealed' && revealedAnswer && (
            <p className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-warning font-bold text-base animate-fadeIn">
              答え：{revealedAnswer}
            </p>
          )}
        </div>
      </form>

      {/* Attempts + Skip row */}
      <div className="flex items-center justify-between mt-12">
        {/* Attempt dots */}
        <div className="flex items-center gap-2">
          <span className="text-star-white/40 text-xs mr-1">残り：</span>
          {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
            <span
              key={i}
              className={[
                'text-lg transition-colors duration-300',
                i < attemptsLeft ? 'text-star-gold' : 'text-star-white/20',
              ].join(' ')}
            >
              {i < attemptsLeft ? '\u25CF' : '\u25CB'}
            </span>
          ))}
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          disabled={feedback === 'correct' || feedback === 'revealed'}
          className="btn-secondary text-sm px-5 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          スキップ
        </button>
      </div>
    </div>
  )
}
