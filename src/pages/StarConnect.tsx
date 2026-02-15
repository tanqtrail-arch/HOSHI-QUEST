import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { constellations, type Constellation } from '../data/constellations'

// ---------- Types ----------

type Difficulty = 'easy' | 'normal' | 'hard'
type Phase = 'start' | 'playing' | 'result'

interface GameState {
  currentConstellation: Constellation
  confirmedConnections: Set<string>
  selectedStar: number | null
  wrongAttempts: number
  round: number
  startTime: number
}

// ---------- Helpers ----------

/** Produce a canonical key for a connection so (0,1) and (1,0) match. */
function connectionKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/** Shuffle an array (Fisher-Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick n random constellations. */
function pickRound(n: number): Constellation[] {
  return shuffle(constellations).slice(0, Math.min(n, constellations.length))
}

/** Generate distractor stars that don't overlap existing stars. */
function generateDistractors(
  existing: { x: number; y: number }[],
  count: number,
): { x: number; y: number; magnitude: number }[] {
  const result: { x: number; y: number; magnitude: number }[] = []
  let attempts = 0
  while (result.length < count && attempts < 200) {
    attempts++
    const x = 0.05 + Math.random() * 0.9
    const y = 0.05 + Math.random() * 0.9
    const tooClose = [...existing, ...result].some(
      (s) => Math.hypot(s.x - x, s.y - y) < 0.08,
    )
    if (!tooClose) {
      result.push({ x, y, magnitude: 2.5 + Math.random() * 2 })
    }
  }
  return result
}

/** Format elapsed seconds as mm:ss. */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---------- Constants ----------

const ROUNDS_PER_GAME = 5
const HIT_RADIUS = 22 // pixels - generous touch target
const STAR_BASE_RADIUS = 4

// ---------- Main Component ----------

export default function StarConnect() {
  // --- Phase & config ---
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')

  // --- Round deck ---
  const [deck, setDeck] = useState<Constellation[]>([])

  // --- Game state ---
  const [game, setGame] = useState<GameState | null>(null)

  // --- Distractor stars for hard mode (appended after real stars) ---
  const [distractorStars, setDistractorStars] = useState<
    { x: number; y: number; magnitude: number }[]
  >([])

  // --- Temporary wrong line animation ---
  const [wrongLine, setWrongLine] = useState<{
    from: number
    to: number
  } | null>(null)
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Completion celebration ---
  const [celebrating, setCelebrating] = useState(false)

  // --- Timer tick ---
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // --- Canvas ref ---
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // --- Total stats across all rounds ---
  const [totalWrong, setTotalWrong] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  // ---------- Derived ----------

  const allStars = useMemo(() => {
    if (!game) return []
    const real = game.currentConstellation.stars
    if (difficulty === 'hard') {
      return [...real, ...distractorStars]
    }
    return [...real]
  }, [game, difficulty, distractorStars])

  /** Set of canonical connection keys required. */
  const requiredConnections = useMemo(() => {
    if (!game) return new Set<string>()
    return new Set(
      game.currentConstellation.connections.map((c) =>
        connectionKey(c.from, c.to),
      ),
    )
  }, [game])

  const isConstellationComplete = useMemo(() => {
    if (!game) return false
    for (const key of requiredConnections) {
      if (!game.confirmedConnections.has(key)) return false
    }
    return true
  }, [game, requiredConnections])

  // ---------- Timer ----------

  useEffect(() => {
    if (phase === 'playing' && game && !celebrating) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - game.startTime) / 1000))
      }, 250)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, game, celebrating])

  // ---------- Handle constellation completion ----------

  useEffect(() => {
    if (!isConstellationComplete || !game || celebrating) return
    setCelebrating(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const roundTime = Math.floor((Date.now() - game.startTime) / 1000)
    setTotalTime((prev) => prev + roundTime)
    setTotalWrong((prev) => prev + game.wrongAttempts)
    setCompletedCount((prev) => prev + 1)
  }, [isConstellationComplete, game, celebrating])

  // ---------- Start game ----------

  function startGame() {
    const chosen = pickRound(ROUNDS_PER_GAME)
    setDeck(chosen)
    setTotalWrong(0)
    setTotalTime(0)
    setCompletedCount(0)
    startRound(chosen, 0)
  }

  function startRound(roundDeck: Constellation[], roundIndex: number) {
    const constellation = roundDeck[roundIndex]
    const distractors =
      difficulty === 'hard'
        ? generateDistractors(
            constellation.stars,
            3 + Math.floor(Math.random() * 3),
          )
        : []
    setDistractorStars(distractors)
    setCelebrating(false)
    setWrongLine(null)
    setGame({
      currentConstellation: constellation,
      confirmedConnections: new Set(),
      selectedStar: null,
      wrongAttempts: 0,
      round: roundIndex,
      startTime: Date.now(),
    })
    setElapsed(0)
    setPhase('playing')
  }

  function advanceRound() {
    if (!game) return
    const nextRound = game.round + 1
    if (nextRound >= deck.length) {
      setPhase('result')
    } else {
      startRound(deck, nextRound)
    }
  }

  // ---------- Canvas sizing ----------

  const [canvasSize, setCanvasSize] = useState({ w: 500, h: 500 })

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const size = Math.min(rect.width, 600)
    setCanvasSize({ w: size, h: size })
  }, [])

  useEffect(() => {
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    return () => window.removeEventListener('resize', updateCanvasSize)
  }, [updateCanvasSize])

  // ---------- Canvas drawing ----------

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !game) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const displayW = canvasSize.w
    const displayH = canvasSize.h
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const W = displayW
    const H = displayH
    const pad = 30

    /** Convert star fraction coords (0-1) to canvas pixel coords. */
    function toPixel(s: { x: number; y: number }): [number, number] {
      return [pad + s.x * (W - pad * 2), pad + s.y * (H - pad * 2)]
    }

    // --- Clear with background ---
    const bg = ctx.createRadialGradient(
      W / 2,
      H / 2,
      0,
      W / 2,
      H / 2,
      W * 0.7,
    )
    bg.addColorStop(0, '#0f0f2e')
    bg.addColorStop(1, '#0a0a1a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // Subtle static starfield dots (seeded)
    const rng = (seed: number) => {
      let s = seed
      return () => {
        s = (s * 16807) % 2147483647
        return s / 2147483647
      }
    }
    const rand = rng(42)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 60; i++) {
      const bx = rand() * W
      const by = rand() * H
      ctx.beginPath()
      ctx.arc(bx, by, 0.4 + rand() * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }

    const { confirmedConnections, selectedStar } = game
    const constellation = game.currentConstellation
    const stars = allStars

    // --- Ghost lines (easy mode) ---
    if (difficulty === 'easy') {
      ctx.save()
      ctx.strokeStyle = 'rgba(126, 200, 227, 0.12)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 6])
      constellation.connections.forEach((conn) => {
        const key = connectionKey(conn.from, conn.to)
        if (!confirmedConnections.has(key)) {
          const [x1, y1] = toPixel(constellation.stars[conn.from])
          const [x2, y2] = toPixel(constellation.stars[conn.to])
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      })
      ctx.restore()
    }

    // --- Confirmed connections ---
    confirmedConnections.forEach((key) => {
      const [aStr, bStr] = key.split('-')
      const a = parseInt(aStr, 10)
      const b = parseInt(bStr, 10)
      if (a >= constellation.stars.length || b >= constellation.stars.length)
        return
      const [x1, y1] = toPixel(constellation.stars[a])
      const [x2, y2] = toPixel(constellation.stars[b])

      // Glow layer
      ctx.save()
      ctx.strokeStyle = celebrating
        ? 'rgba(255, 215, 0, 0.5)'
        : 'rgba(255, 215, 0, 0.25)'
      ctx.lineWidth = celebrating ? 6 : 4
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = celebrating ? 16 : 8
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.restore()

      // Core line
      ctx.save()
      ctx.strokeStyle = celebrating ? '#ffd700' : '#e6c200'
      ctx.lineWidth = celebrating ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.restore()
    })

    // --- Wrong line flash ---
    if (wrongLine) {
      const [x1, y1] = toPixel(stars[wrongLine.from])
      const [x2, y2] = toPixel(stars[wrongLine.to])
      ctx.save()
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#e74c3c'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.restore()
    }

    // --- Draw stars ---
    stars.forEach((star, i) => {
      const [sx, sy] = toPixel(star)
      const isSelected = selectedStar === i
      const isDistractor =
        difficulty === 'hard' && i >= constellation.stars.length

      // Visual radius (brighter = bigger)
      const mag = star.magnitude
      const radius = Math.max(
        STAR_BASE_RADIUS,
        (6 - Math.min(mag, 5)) * 1.2,
      )

      // Selected star: pulsing gold glow
      if (isSelected) {
        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200)
        const glowRadius = radius * 4 + pulse * 6
        const grad = ctx.createRadialGradient(
          sx,
          sy,
          0,
          sx,
          sy,
          glowRadius,
        )
        grad.addColorStop(0, `rgba(255, 215, 0, ${0.5 + pulse * 0.3})`)
        grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)')
        grad.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      // Ambient glow for unselected stars
      if (!isSelected) {
        const glowR = radius * 2.5
        const gGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR)
        if (celebrating && !isDistractor) {
          gGrad.addColorStop(0, 'rgba(255, 215, 0, 0.4)')
          gGrad.addColorStop(1, 'transparent')
        } else if (isDistractor) {
          gGrad.addColorStop(0, 'rgba(200, 200, 220, 0.12)')
          gGrad.addColorStop(1, 'transparent')
        } else {
          gGrad.addColorStop(0, 'rgba(126, 200, 227, 0.25)')
          gGrad.addColorStop(1, 'transparent')
        }
        ctx.beginPath()
        ctx.arc(sx, sy, glowR, 0, Math.PI * 2)
        ctx.fillStyle = gGrad
        ctx.fill()
      }

      // Star dot
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      if (isSelected) {
        ctx.fillStyle = '#ffd700'
      } else if (celebrating && !isDistractor) {
        ctx.fillStyle = '#ffd700'
      } else if (mag <= 1) {
        ctx.fillStyle = '#fff8e0'
      } else {
        ctx.fillStyle = '#d0d8ff'
      }
      ctx.fill()

      // Selection ring
      if (isSelected) {
        ctx.save()
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 2
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(sx, sy, radius + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
    })

    // --- Celebration overlay: constellation name ---
    if (celebrating) {
      ctx.save()
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const nameY = H / 2

      // Semi-transparent background pill
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.beginPath()
      ctx.roundRect(W / 2 - 130, nameY - 32, 260, 64, 14)
      ctx.fill()

      // Constellation name
      ctx.font =
        'bold 26px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif'
      ctx.fillStyle = '#ffd700'
      ctx.shadowColor = '#ffd700'
      ctx.shadowBlur = 20
      ctx.fillText(constellation.name, W / 2, nameY - 4)

      // Latin name
      ctx.shadowBlur = 0
      ctx.font =
        '13px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif'
      ctx.fillStyle = 'rgba(126, 200, 227, 0.9)'
      ctx.fillText(constellation.latin, W / 2, nameY + 20)
      ctx.restore()
    }
  }, [game, allStars, canvasSize, difficulty, celebrating, wrongLine])

  // --- Animation loop (for pulsing selected star & celebration) ---
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (phase !== 'playing' || !game) return
    let running = true
    const loop = () => {
      if (!running) return
      draw()
      animFrameRef.current = requestAnimationFrame(loop)
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [phase, game, draw])

  // ---------- Interaction ----------

  const handleCanvasInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!game || celebrating) return
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top
      const W = canvasSize.w
      const H = canvasSize.h
      const pad = 30

      // Find closest star within hit radius
      let closest = -1
      let closestDist = Infinity
      allStars.forEach((star, i) => {
        const sx = pad + star.x * (W - pad * 2)
        const sy = pad + star.y * (H - pad * 2)
        const dist = Math.hypot(px - sx, py - sy)
        if (dist < HIT_RADIUS && dist < closestDist) {
          closest = i
          closestDist = dist
        }
      })

      if (closest === -1) {
        // Clicked empty space: deselect
        setGame((prev) => (prev ? { ...prev, selectedStar: null } : prev))
        return
      }

      if (game.selectedStar === null) {
        // First click: select
        setGame((prev) => (prev ? { ...prev, selectedStar: closest } : prev))
      } else if (game.selectedStar === closest) {
        // Clicked same star: deselect
        setGame((prev) => (prev ? { ...prev, selectedStar: null } : prev))
      } else {
        // Second click: attempt connection
        const from = game.selectedStar
        const to = closest
        const key = connectionKey(from, to)

        if (game.confirmedConnections.has(key)) {
          // Already confirmed: just re-select
          setGame((prev) =>
            prev ? { ...prev, selectedStar: closest } : prev,
          )
          return
        }

        if (requiredConnections.has(key)) {
          // Correct connection
          setGame((prev) => {
            if (!prev) return prev
            const newConfirmed = new Set(prev.confirmedConnections)
            newConfirmed.add(key)
            return {
              ...prev,
              confirmedConnections: newConfirmed,
              selectedStar: null,
            }
          })
        } else {
          // Wrong connection
          setGame((prev) =>
            prev
              ? {
                  ...prev,
                  wrongAttempts: prev.wrongAttempts + 1,
                  selectedStar: null,
                }
              : prev,
          )
          setWrongLine({ from, to })
          if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current)
          wrongTimerRef.current = setTimeout(() => setWrongLine(null), 500)
        }
      }
    },
    [game, allStars, canvasSize, requiredConnections, celebrating],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleCanvasInteraction(e.clientX, e.clientY)
    },
    [handleCanvasInteraction],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY)
      }
    },
    [handleCanvasInteraction],
  )

  // ---------- Render: Start Screen ----------

  if (phase === 'start') {
    const difficultyOptions: {
      key: Difficulty
      label: string
      desc: string
    }[] = [
      { key: 'easy', label: 'かんたん', desc: '接続ヒントあり' },
      { key: 'normal', label: 'ふつう', desc: 'ヒントなし' },
      { key: 'hard', label: 'むずかしい', desc: 'おとり星あり' },
    ]

    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星つなぎパズル
          </h1>
          <p className="text-star-white/60 text-sm">
            星と星をつないで星座を完成させよう
          </p>
        </div>

        <div className="game-card mb-8">
          <h2 className="text-lg font-bold mb-4 text-star-white">
            難易度を選択
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setDifficulty(opt.key)}
                className={`py-3 px-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                  difficulty === opt.key
                    ? 'bg-star-gold/20 text-star-gold border border-star-gold/50'
                    : 'bg-white/5 text-star-white/60 border border-white/10 hover:bg-white/10 hover:text-star-white'
                }`}
              >
                <span className="block text-base">{opt.label}</span>
                <span className="block text-[10px] mt-1 opacity-70 font-normal">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startGame}
          className="btn-primary w-full text-lg py-4"
        >
          スタート
        </button>
      </div>
    )
  }

  // ---------- Render: Result Screen ----------

  if (phase === 'result') {
    const avgTime =
      completedCount > 0 ? Math.round(totalTime / completedCount) : 0

    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">&#127775;</div>
          <h1 className="text-2xl font-bold mb-2 text-star-gold">
            ラウンド完了！
          </h1>
          <p className="text-star-white/60">
            {completedCount} つの星座をつなぎました
          </p>
        </div>

        <div className="game-card mb-6">
          <h2 className="text-lg font-bold mb-4 text-star-white text-center">
            結果
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">完成した星座</span>
              <span className="text-star-gold font-bold text-lg">
                {completedCount} / {ROUNDS_PER_GAME}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">合計タイム</span>
              <span className="text-star-blue font-bold text-lg">
                {formatTime(totalTime)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">平均タイム</span>
              <span className="text-star-blue font-bold text-lg">
                {formatTime(avgTime)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-star-white/70">ミス回数</span>
              <span
                className={`font-bold text-lg ${totalWrong === 0 ? 'text-success' : 'text-danger'}`}
              >
                {totalWrong} 回
              </span>
            </div>
          </div>
        </div>

        {/* Completed constellation names */}
        <div className="game-card mb-6">
          <h3 className="text-sm font-bold mb-3 text-star-white/70">
            完成した星座
          </h3>
          <div className="flex flex-wrap gap-2">
            {deck.slice(0, completedCount).map((c) => (
              <span
                key={c.id}
                className="px-3 py-1 rounded-full text-xs bg-star-gold/15 text-star-gold border border-star-gold/30"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('start')}
            className="btn-secondary flex-1 py-3"
          >
            設定に戻る
          </button>
          <button onClick={startGame} className="btn-primary flex-1 py-3">
            もう一度
          </button>
        </div>
      </div>
    )
  }

  // ---------- Render: Playing ----------

  if (!game) return null

  const totalConnections = requiredConnections.size
  const confirmedCount = game.confirmedConnections.size

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-star-white/70">
          第{' '}
          <span className="text-star-gold font-bold">{game.round + 1}</span>{' '}
          座 / {deck.length}座
        </div>
        <div className="text-sm text-star-blue font-mono font-bold">
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-star-white/70">
          ミス{' '}
          <span
            className={`font-bold ${game.wrongAttempts > 0 ? 'text-danger' : 'text-success'}`}
          >
            {game.wrongAttempts}
          </span>
        </div>
      </div>

      {/* Constellation name: hidden until complete */}
      <div className="text-center mb-3">
        {celebrating ? (
          <h2 className="text-xl font-bold text-star-gold animate-fadeIn">
            {game.currentConstellation.name}
            <span className="ml-2 text-sm text-star-white/50">
              {game.currentConstellation.latin}
            </span>
          </h2>
        ) : (
          <h2 className="text-xl font-bold text-star-white/40">
            ???（{game.currentConstellation.stars.length} 星）
          </h2>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-star-white/50">接続</span>
          <span className="text-xs text-star-white/50">
            {confirmedCount} / {totalConnections}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-star-blue to-star-gold rounded-full transition-all duration-500"
            style={{
              width: `${totalConnections > 0 ? (confirmedCount / totalConnections) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="w-full flex justify-center mb-4">
        <canvas
          ref={canvasRef}
          className="rounded-xl border border-white/10 cursor-crosshair touch-none"
          style={{ width: canvasSize.w, height: canvasSize.h }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
      </div>

      {/* Hint text */}
      {!celebrating && (
        <p className="text-center text-star-white/30 text-xs mb-4">
          星をタップして選択し、別の星をタップしてつなごう
        </p>
      )}

      {/* Advance button on completion */}
      {celebrating && (
        <div className="text-center animate-fadeIn">
          <button
            onClick={advanceRound}
            className="btn-primary px-8 py-3 text-base"
          >
            {game.round + 1 >= deck.length ? '結果を見る' : '次の星座へ'}
          </button>
        </div>
      )}
    </div>
  )
}
