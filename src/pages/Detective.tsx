import { useState, useEffect, useCallback, useRef } from 'react'
import {
  constellations,
  getRandomConstellations,
  type Constellation,
} from '../data/constellations'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_ROUNDS = 10
const CHOICES_COUNT = 4
const POINTS_BY_HINTS: Record<number, number> = {
  1: 100,
  2: 75,
  3: 50,
  4: 25,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GamePhase = 'start' | 'playing' | 'result'
type RoundPhase = 'hinting' | 'answered'

interface RoundResult {
  constellation: Constellation
  correct: boolean
  hintsUsed: number
  points: number
}

// ---------------------------------------------------------------------------
// Canvas helper: draw a constellation's star pattern
// ---------------------------------------------------------------------------

function drawConstellation(
  ctx: CanvasRenderingContext2D,
  constellation: Constellation,
  width: number,
  height: number,
) {
  const padding = 28

  // Clear and draw dark background
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#0a0a1a'
  ctx.fillRect(0, 0, width, height)

  // Subtle ambient specks
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let gx = padding; gx < width - padding; gx += 18) {
    for (let gy = padding; gy < height - padding; gy += 18) {
      ctx.beginPath()
      ctx.arc(gx, gy, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const toX = (x: number) => padding + x * (width - padding * 2)
  const toY = (y: number) => padding + y * (height - padding * 2)

  // Draw connections as faint lines
  ctx.strokeStyle = 'rgba(126,200,227,0.35)'
  ctx.lineWidth = 1.5
  for (const conn of constellation.connections) {
    const s = constellation.stars[conn.from]
    const e = constellation.stars[conn.to]
    if (!s || !e) continue
    ctx.beginPath()
    ctx.moveTo(toX(s.x), toY(s.y))
    ctx.lineTo(toX(e.x), toY(e.y))
    ctx.stroke()
  }

  // Draw stars as glowing dots (size based on magnitude)
  for (const star of constellation.stars) {
    const cx = toX(star.x)
    const cy = toY(star.y)
    const radius = Math.max(2, 5 - star.magnitude * 0.7)

    // Outer glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3)
    grad.addColorStop(0, 'rgba(255,215,0,0.6)')
    grad.addColorStop(0.5, 'rgba(255,215,0,0.12)')
    grad.addColorStop(1, 'rgba(255,215,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core dot
    ctx.fillStyle = star.magnitude < 1.5 ? '#ffd700' : '#f0f0ff'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  // Name label at bottom
  ctx.fillStyle = 'rgba(255,215,0,0.8)'
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(constellation.name, width / 2, height - 8)
}

// ---------------------------------------------------------------------------
// Helper: build multiple-choice options
// ---------------------------------------------------------------------------

function pickChoices(
  correct: Constellation,
  pool: Constellation[],
): Constellation[] {
  const wrong = pool
    .filter((c) => c.id !== correct.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, CHOICES_COUNT - 1)
  return [correct, ...wrong].sort(() => Math.random() - 0.5)
}

// ---------------------------------------------------------------------------
// Helper: derive a 1-5 star rating from total score
// ---------------------------------------------------------------------------

function starRating(score: number, maxScore: number): number {
  const pct = score / maxScore
  if (pct >= 0.9) return 5
  if (pct >= 0.7) return 4
  if (pct >= 0.5) return 3
  if (pct >= 0.3) return 2
  return 1
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Detective() {
  /* ---- game-level state ---- */
  const [phase, setPhase] = useState<GamePhase>('start')
  const [roundQuestions, setRoundQuestions] = useState<Constellation[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [results, setResults] = useState<RoundResult[]>([])

  /* ---- round-level state ---- */
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('hinting')
  const [revealedHints, setRevealedHints] = useState(0)
  const [choices, setChoices] = useState<Constellation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [flashClass, setFlashClass] = useState('')

  /* ---- refs ---- */
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* current question */
  const current: Constellation | undefined = roundQuestions[roundIndex]

  // ----------------------------------------------------------------
  // Start a new game
  // ----------------------------------------------------------------

  const startGame = useCallback(() => {
    const questions = getRandomConstellations(TOTAL_ROUNDS)
    setRoundQuestions(questions)
    setRoundIndex(0)
    setScore(0)
    setResults([])
    setPhase('playing')
  }, [])

  // ----------------------------------------------------------------
  // Reset round state whenever roundIndex changes
  // ----------------------------------------------------------------

  useEffect(() => {
    if (phase !== 'playing' || !current) return
    setRoundPhase('hinting')
    setRevealedHints(0)
    setChoices(pickChoices(current, constellations))
    setSelectedId(null)
    setIsCorrect(null)
    setFlashClass('')
  }, [phase, roundIndex, current])

  // ----------------------------------------------------------------
  // Draw constellation on canvas after answering
  // ----------------------------------------------------------------

  useEffect(() => {
    if (roundPhase !== 'answered' || !current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawConstellation(ctx, current, canvas.width, canvas.height)
  }, [roundPhase, current])

  // ----------------------------------------------------------------
  // Reveal next hint
  // ----------------------------------------------------------------

  const revealHint = useCallback(() => {
    if (!current) return
    setRevealedHints((prev) => Math.min(prev + 1, current.hints.length))
  }, [current])

  // ----------------------------------------------------------------
  // Handle player's answer
  // ----------------------------------------------------------------

  const handleAnswer = useCallback(
    (choiceId: string) => {
      if (!current || roundPhase !== 'hinting') return
      const correct = choiceId === current.id
      const hintsUsed = Math.max(revealedHints, 1)
      const pts = correct ? (POINTS_BY_HINTS[hintsUsed] ?? 25) : 0

      setSelectedId(choiceId)
      setIsCorrect(correct)
      setScore((prev) => prev + pts)
      setResults((prev) => [
        ...prev,
        { constellation: current, correct, hintsUsed, points: pts },
      ])
      setFlashClass(correct ? 'animate-fadeIn' : 'animate-shake')
      setRoundPhase('answered')
    },
    [current, roundPhase, revealedHints],
  )

  // ----------------------------------------------------------------
  // Advance to next round or show results
  // ----------------------------------------------------------------

  const nextRound = useCallback(() => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      setPhase('result')
    } else {
      setRoundIndex((prev) => prev + 1)
    }
  }, [roundIndex])

  // ================================================================
  // RENDER -- Start Screen
  // ================================================================

  if (phase === 'start') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card max-w-lg w-full text-center animate-fadeIn">
          <h1 className="text-4xl font-bold text-star-gold mb-2">
            星座探偵
          </h1>
          <p className="text-star-blue text-lg mb-6">
            Constellation Detective
          </p>

          <div className="text-left bg-space-900/60 rounded-xl p-5 mb-8 space-y-3 text-sm leading-relaxed">
            <h2 className="text-base font-bold text-star-gold mb-2">
              遊び方
            </h2>
            <ul className="list-disc list-inside space-y-2 text-star-white/80">
              <li>全{TOTAL_ROUNDS}問。ヒントから星座を当てよう！</li>
              <li>ヒントカードを1枚ずつめくれます。</li>
              <li>少ないヒントで当てるほど高得点！</li>
              <li>
                <span className="text-star-gold">1ヒント</span> = 100点 /{' '}
                <span className="text-star-gold">2ヒント</span> = 75点 /{' '}
                <span className="text-star-gold">3ヒント</span> = 50点 /{' '}
                <span className="text-star-gold">4ヒント</span> = 25点
              </li>
              <li>答えの後に星座の情報が見られます。</li>
            </ul>
          </div>

          <button className="btn-primary text-lg px-10 py-3" onClick={startGame}>
            ゲームスタート
          </button>
        </div>
      </div>
    )
  }

  // ================================================================
  // RENDER -- Final Result Screen
  // ================================================================

  if (phase === 'result') {
    const maxScore = TOTAL_ROUNDS * 100
    const stars = starRating(score, maxScore)
    const correctCount = results.filter((r) => r.correct).length

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="game-card max-w-lg w-full text-center animate-fadeIn">
          <h2 className="text-3xl font-bold text-star-gold mb-4">結果発表</h2>

          {/* Star rating */}
          <div className="text-4xl mb-4" aria-label={`${stars}つ星`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < stars ? 'text-star-gold' : 'text-space-600'}>
                ★
              </span>
            ))}
          </div>

          {/* Score */}
          <p className="text-5xl font-bold text-star-gold mb-2">
            {score}
            <span className="text-xl text-star-white/60"> / {maxScore} 点</span>
          </p>
          <p className="text-star-blue mb-6">
            正解数: {correctCount} / {TOTAL_ROUNDS}
          </p>

          {/* Per-round summary */}
          <div className="text-left bg-space-900/60 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto space-y-2 text-sm">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  r.correct
                    ? 'bg-success/10 border border-success/30'
                    : 'bg-danger/10 border border-danger/30'
                }`}
              >
                <span>
                  第{i + 1}問:{' '}
                  <span className="font-bold">{r.constellation.name}</span>
                </span>
                <span className="flex items-center gap-2">
                  {r.correct ? (
                    <span className="text-success font-bold">正解</span>
                  ) : (
                    <span className="text-danger font-bold">不正解</span>
                  )}
                  <span className="text-star-gold">{r.points}pt</span>
                </span>
              </div>
            ))}
          </div>

          <button
            className="btn-primary text-lg px-10 py-3"
            onClick={() => setPhase('start')}
          >
            もう一度遊ぶ
          </button>
        </div>
      </div>
    )
  }

  // ================================================================
  // RENDER -- Playing (hinting / answered)
  // ================================================================

  if (!current) return null

  const totalHints = current.hints.length
  const allHintsRevealed = revealedHints >= totalHints

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pb-12">
      {/* ---- Header bar ---- */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <span className="text-star-blue font-bold">
          第{roundIndex + 1}問 / {TOTAL_ROUNDS}問
        </span>
        <span className="text-star-gold font-bold text-lg">{score} 点</span>
      </div>

      {/* ---- Hint cards ---- */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {current.hints.map((hint, idx) => {
          const isRevealed = idx < revealedHints
          return (
            <div key={idx} className="relative h-28" style={{ perspective: '600px' }}>
              <div
                className="relative w-full h-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front face (unrevealed) */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-nebula-purple/60 to-nebula-blue/60 border border-white/10"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="text-3xl font-bold text-star-gold/80 select-none">
                    ?
                  </span>
                  <span className="absolute bottom-2 right-3 text-xs text-star-white/40">
                    ヒント {idx + 1}
                  </span>
                </div>

                {/* Back face (revealed) */}
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-space-700 to-space-800 border border-star-gold/30 p-4"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <p className="text-sm text-star-white leading-relaxed text-center">
                    {hint}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ---- Reveal hint button ---- */}
      {roundPhase === 'hinting' && !allHintsRevealed && (
        <button className="btn-secondary mb-6 animate-glow" onClick={revealHint}>
          ヒントをめくる（残り {totalHints - revealedHints} 枚）
        </button>
      )}

      {/* ---- 4-choice answer buttons ---- */}
      {roundPhase === 'hinting' && revealedHints > 0 && (
        <div className="w-full max-w-2xl animate-fadeIn">
          <p className="text-center text-star-white/60 text-sm mb-3">
            この星座は何でしょう？
          </p>
          <div className="grid grid-cols-2 gap-3">
            {choices.map((c) => (
              <button
                key={c.id}
                className="btn-primary py-4 text-base"
                onClick={() => handleAnswer(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Answer feedback ---- */}
      {roundPhase === 'answered' && (
        <div className={`w-full max-w-2xl ${flashClass}`}>
          {/* Correct / Wrong banner */}
          <div
            className={`text-center rounded-xl py-4 mb-4 font-bold text-2xl ${
              isCorrect
                ? 'bg-success/20 text-success border border-success/40'
                : 'bg-danger/20 text-danger border border-danger/40'
            }`}
          >
            {isCorrect ? '正解！' : '残念...'}
            {!isCorrect && (
              <p className="text-base mt-1 text-star-white/70">
                正解は{' '}
                <span className="text-star-gold font-bold">{current.name}</span>{' '}
                でした
              </p>
            )}
          </div>

          {/* Choices recap with colour feedback */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {choices.map((c) => {
              let cls =
                'py-4 text-base rounded-xl font-bold border text-center '
              if (c.id === current.id) {
                cls += 'bg-success/20 border-success/50 text-success'
              } else if (c.id === selectedId) {
                cls += 'bg-danger/20 border-danger/50 text-danger'
              } else {
                cls += 'bg-space-700/50 border-white/10 text-star-white/40'
              }
              return (
                <div key={c.id} className={cls}>
                  {c.name}
                </div>
              )
            })}
          </div>

          {/* Constellation info card */}
          <div className="game-card mb-6 animate-slideUp">
            <div className="flex flex-col sm:flex-row gap-4">
              <canvas
                ref={canvasRef}
                width={220}
                height={220}
                className="rounded-lg shrink-0 self-center"
              />

              <div className="flex-1 space-y-2 text-sm">
                <h3 className="text-xl font-bold text-star-gold">
                  {current.name}
                  <span className="text-star-blue text-sm font-normal ml-2">
                    {current.latin}
                  </span>
                </h3>
                <p>
                  <span className="text-star-white/50">季節:</span> {current.season}
                </p>
                <p>
                  <span className="text-star-white/50">最も明るい星:</span>{' '}
                  {current.brightestStar}
                </p>
                <p>
                  <span className="text-star-white/50">見つけ方:</span>{' '}
                  {current.findingTip}
                </p>
                <p className="text-star-white/80 leading-relaxed">
                  {current.mythology}
                </p>
              </div>
            </div>
          </div>

          {/* Next / Finish button */}
          <div className="text-center">
            <button className="btn-primary text-lg px-10 py-3" onClick={nextRound}>
              {roundIndex + 1 >= TOTAL_ROUNDS ? '結果を見る' : '次の問題へ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
