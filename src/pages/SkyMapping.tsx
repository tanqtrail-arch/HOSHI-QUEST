import { useState, useRef, useEffect, useCallback } from 'react'
import { constellations, type Constellation, type Star } from '../data/constellations'

// ── Season mapping ──
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter'

const seasonMap: Record<SeasonKey, { label: string; dataValue: string }> = {
  spring: { label: '春の空', dataValue: '春' },
  summer: { label: '夏の空', dataValue: '夏' },
  autumn: { label: '秋の空', dataValue: '秋' },
  winter: { label: '冬の空', dataValue: '冬' },
}

const QUESTIONS_PER_ROUND = 10
const MAX_TRIES = 2
const HIT_PADDING = 3 // percentage padding for forgiveness on hit detection

// ── Helpers ──

function getGlobalStarPosition(
  constellation: Constellation,
  star: Star,
  canvasWidth: number,
  canvasHeight: number,
) {
  const area = constellation.area
  // star.x / star.y are in 0-100 range
  const globalX = ((area.x + (star.x * area.width) / 100) * canvasWidth) / 100
  const globalY = ((area.y + (star.y * area.height) / 100) * canvasHeight) / 100
  return { x: globalX, y: globalY }
}

function getStarRadius(magnitude: number): number {
  // Brighter stars have lower magnitude values (can be negative)
  // Map roughly from magnitude range [-1.5, 4.5] to radius [4, 1]
  const clamped = Math.max(-1.5, Math.min(magnitude, 4.5))
  return 4 - ((clamped + 1.5) * 3) / 6
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ── Game phases ──
type GamePhase = 'start' | 'playing' | 'result'

interface ClickFeedback {
  x: number
  y: number
  type: 'correct' | 'wrong'
  timestamp: number
}

interface RevealedConstellation {
  id: string
  wasCorrect: boolean
}

export default function SkyMapping() {
  // Game state
  const [phase, setPhase] = useState<GamePhase>('start')
  const [selectedSeason, setSelectedSeason] = useState<SeasonKey>('winter')
  const [seasonConstellations, setSeasonConstellations] = useState<Constellation[]>([])
  const [questionQueue, setQuestionQueue] = useState<Constellation[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [triesLeft, setTriesLeft] = useState(MAX_TRIES)
  const [revealed, setRevealed] = useState<RevealedConstellation[]>([])
  const [feedback, setFeedback] = useState<ClickFeedback | null>(null)
  const [showToast, setShowToast] = useState<string | null>(null)
  const [hintPulse, setHintPulse] = useState<{ x: number; y: number } | null>(null)
  const [showInfoCard, setShowInfoCard] = useState(false)
  const [waitingForNext, setWaitingForNext] = useState(false)

  // Canvas ref & dimensions
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const animFrameRef = useRef<number>(0)

  const currentConstellation = questionQueue[currentIndex] ?? null

  // ── Start game ──
  const startGame = useCallback(() => {
    const seasonData = seasonMap[selectedSeason].dataValue
    const filtered = constellations.filter((c) => c.season === seasonData)
    const shuffled = shuffleArray(filtered)
    const queue = shuffled.slice(0, Math.min(QUESTIONS_PER_ROUND, shuffled.length))

    setSeasonConstellations(filtered)
    setQuestionQueue(queue)
    setCurrentIndex(0)
    setScore(0)
    setTriesLeft(MAX_TRIES)
    setRevealed([])
    setFeedback(null)
    setShowToast(null)
    setHintPulse(null)
    setShowInfoCard(false)
    setWaitingForNext(false)
    setPhase('playing')
  }, [selectedSeason])

  // ── Canvas sizing ──
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(Math.min(width * 9 / 16, window.innerHeight - 140))
      setCanvasSize({ width, height })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [phase])

  // ── Canvas drawing ──
  useEffect(() => {
    if (phase !== 'playing' || canvasSize.width === 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    const startTime = performance.now()

    function draw(time: number) {
      if (!ctx || !canvas) return
      const elapsed = time - startTime
      const { width, height } = canvasSize

      // Sky gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, '#050515')
      grad.addColorStop(0.6, '#0a0a2e')
      grad.addColorStop(1, '#121240')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // Draw some random background stars for atmosphere (deterministic from index)
      const bgStarCount = Math.floor((width * height) / 12000)
      for (let i = 0; i < bgStarCount; i++) {
        const px = ((i * 7919 + 104729) % 100000) / 100000
        const py = ((i * 6271 + 97777) % 100000) / 100000
        const pr = ((i * 3571 + 55661) % 100000) / 100000
        const twinkle = Math.sin(elapsed * 0.001 + i * 0.7) * 0.3 + 0.7

        ctx.beginPath()
        ctx.arc(px * width, py * height, pr * 0.8 + 0.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 200, 240, ${0.15 * twinkle})`
        ctx.fill()
      }

      // Draw all constellation stars for this season
      for (const constellation of seasonConstellations) {
        const isRevealed = revealed.some((r) => r.id === constellation.id)

        for (const star of constellation.stars) {
          const pos = getGlobalStarPosition(constellation, star, width, height)
          const radius = getStarRadius(star.magnitude)

          if (isRevealed) {
            // Revealed: bright stars with golden glow
            const twinkle = Math.sin(elapsed * 0.002 + pos.x * 0.1) * 0.15 + 0.85

            // Outer glow
            const glowGrad = ctx.createRadialGradient(
              pos.x, pos.y, 0,
              pos.x, pos.y, radius * 4,
            )
            glowGrad.addColorStop(0, `rgba(255, 215, 0, ${0.6 * twinkle})`)
            glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)')
            ctx.beginPath()
            ctx.arc(pos.x, pos.y, radius * 4, 0, Math.PI * 2)
            ctx.fillStyle = glowGrad
            ctx.fill()

            // Star dot
            ctx.beginPath()
            ctx.arc(pos.x, pos.y, radius * 1.3, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 240, 200, ${twinkle})`
            ctx.fill()
          } else {
            // Faint star (no labels, no connections)
            const twinkle =
              Math.sin(elapsed * 0.0015 + pos.x * 0.05 + pos.y * 0.05) * 0.2 + 0.5

            ctx.beginPath()
            ctx.arc(pos.x, pos.y, radius * 0.8, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(180, 190, 220, ${0.3 * twinkle})`
            ctx.fill()

            // Subtle glow for brighter stars
            if (star.magnitude < 1.5) {
              ctx.beginPath()
              ctx.arc(pos.x, pos.y, radius * 2, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(180, 190, 220, ${0.08 * twinkle})`
              ctx.fill()
            }
          }
        }

        // Draw connections for revealed constellations
        if (isRevealed) {
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          for (const conn of constellation.connections) {
            const fromStar = constellation.stars[conn.from]
            const toStar = constellation.stars[conn.to]
            if (!fromStar || !toStar) continue
            const from = getGlobalStarPosition(constellation, fromStar, width, height)
            const to = getGlobalStarPosition(constellation, toStar, width, height)
            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
          }

          // Name label above constellation area
          const area = constellation.area
          const labelX = ((area.x + area.width / 2) * width) / 100
          const labelY = ((area.y - 1.5) * height) / 100
          ctx.font = `bold ${Math.max(12, width * 0.013)}px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'
          ctx.fillText(constellation.name, labelX, Math.max(labelY, 16))
        }
      }

      // Draw hint pulse if active
      if (hintPulse) {
        const pulsePhase = (elapsed % 1500) / 1500
        const pulseOpacity = Math.max(0, 1 - pulsePhase)
        const pulseRadius = 8 + pulsePhase * 35

        ctx.beginPath()
        ctx.arc(hintPulse.x, hintPulse.y, pulseRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulseOpacity * 0.6})`
        ctx.lineWidth = 2
        ctx.stroke()

        // Second pulse offset
        const pulsePhase2 = ((elapsed + 750) % 1500) / 1500
        const pulseOpacity2 = Math.max(0, 1 - pulsePhase2)
        const pulseRadius2 = 8 + pulsePhase2 * 35
        ctx.beginPath()
        ctx.arc(hintPulse.x, hintPulse.y, pulseRadius2, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulseOpacity2 * 0.4})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Draw click feedback
      if (feedback) {
        const fbAge = time - feedback.timestamp
        if (fbAge >= 0 && fbAge < 800) {
          const fadeOut = Math.max(0, 1 - fbAge / 800)
          if (feedback.type === 'wrong') {
            // Red pulse at click point
            const pulseSize = 5 + (fbAge / 800) * 30
            ctx.beginPath()
            ctx.arc(feedback.x, feedback.y, pulseSize, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(231, 76, 60, ${fadeOut * 0.8})`
            ctx.lineWidth = 2
            ctx.stroke()

            // Red dot
            ctx.beginPath()
            ctx.arc(feedback.x, feedback.y, 4, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(231, 76, 60, ${fadeOut})`
            ctx.fill()
          } else {
            // Gold expanding ring for correct
            const ringSize = 10 + (fbAge / 800) * 50
            ctx.beginPath()
            ctx.arc(feedback.x, feedback.y, ringSize, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(255, 215, 0, ${fadeOut * 0.7})`
            ctx.lineWidth = 3
            ctx.stroke()
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [phase, canvasSize, seasonConstellations, revealed, currentConstellation, feedback, hintPulse])

  // ── Hit detection ──
  function isHit(
    clickXPercent: number,
    clickYPercent: number,
    constellation: Constellation,
  ): boolean {
    const area = constellation.area
    const pad = HIT_PADDING
    return (
      clickXPercent >= area.x - pad &&
      clickXPercent <= area.x + area.width + pad &&
      clickYPercent >= area.y - pad &&
      clickYPercent <= area.y + area.height + pad
    )
  }

  // ── Advance to next question ──
  const advanceToNext = useCallback(() => {
    setFeedback(null)
    setHintPulse(null)
    setShowInfoCard(false)
    setWaitingForNext(false)

    if (currentIndex + 1 >= questionQueue.length) {
      setPhase('result')
    } else {
      setCurrentIndex((prev) => prev + 1)
      setTriesLeft(MAX_TRIES)
    }
  }, [currentIndex, questionQueue.length])

  // ── Handle canvas click ──
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!currentConstellation || waitingForNext) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    const clickXPercent = (clickX / canvasSize.width) * 100
    const clickYPercent = (clickY / canvasSize.height) * 100

    if (isHit(clickXPercent, clickYPercent, currentConstellation)) {
      // Correct!
      setScore((prev) => prev + 1)
      setRevealed((prev) => [...prev, { id: currentConstellation.id, wasCorrect: true }])
      setFeedback({ x: clickX, y: clickY, type: 'correct', timestamp: performance.now() })
      setShowToast('正解!')
      setShowInfoCard(true)
      setWaitingForNext(true)

      setTimeout(() => setShowToast(null), 1500)
      setTimeout(() => advanceToNext(), 2800)
    } else {
      // Wrong
      const newTries = triesLeft - 1
      setTriesLeft(newTries)
      setFeedback({ x: clickX, y: clickY, type: 'wrong', timestamp: performance.now() })

      if (newTries > 0) {
        // Give hint: pulse at correct location
        setShowToast('ここじゃないよ')
        const area = currentConstellation.area
        const hintX = ((area.x + area.width / 2) * canvasSize.width) / 100
        const hintY = ((area.y + area.height / 2) * canvasSize.height) / 100
        setHintPulse({ x: hintX, y: hintY })

        setTimeout(() => setShowToast(null), 1200)
      } else {
        // Out of tries - reveal the answer
        setShowToast('残念...ここにあるよ')
        setRevealed((prev) => [...prev, { id: currentConstellation.id, wasCorrect: false }])
        setShowInfoCard(true)
        setWaitingForNext(true)

        setTimeout(() => setShowToast(null), 1500)
        setTimeout(() => advanceToNext(), 2800)
      }
    }
  }

  // ══════════════════════════════
  //  Render: Start screen
  // ══════════════════════════════
  if (phase === 'start') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-star-blue via-star-white to-star-gold bg-clip-text text-transparent">
            星空マッピング
          </h1>
          <p className="text-star-white/50 text-lg">夜空の中から星座を見つけ出そう</p>
        </div>

        {/* Season selector */}
        <div className="mb-8">
          <p className="text-star-white/70 text-center mb-4 font-bold">季節を選んでください</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(seasonMap) as SeasonKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSelectedSeason(key)}
                className={`py-3 px-4 rounded-xl text-center font-bold transition-all duration-200 cursor-pointer border ${
                  selectedSeason === key
                    ? 'bg-star-gold/20 border-star-gold text-star-gold shadow-[0_0_15px_rgba(255,215,0,0.15)]'
                    : 'bg-white/5 border-white/10 text-star-white/60 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                {seasonMap[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Constellation count */}
        <div className="text-center mb-8">
          <p className="text-star-white/40 text-sm">
            {seasonMap[selectedSeason].dataValue}の星座:{' '}
            {constellations.filter((c) => c.season === seasonMap[selectedSeason].dataValue).length}
            個（最大{QUESTIONS_PER_ROUND}問出題）
          </p>
        </div>

        {/* Start button */}
        <div className="text-center">
          <button onClick={startGame} className="btn-primary text-lg px-10 py-4 animate-glow">
            スタート
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════
  //  Render: Result screen
  // ══════════════════════════════
  if (phase === 'result') {
    const total = questionQueue.length
    const ratio = total > 0 ? score / total : 0
    let resultMessage = ''
    if (ratio === 1) resultMessage = '完璧！星空マスターだ！'
    else if (ratio >= 0.7) resultMessage = 'すばらしい！よく見つけたね！'
    else if (ratio >= 0.4) resultMessage = 'まずまず！もう少し練習しよう！'
    else resultMessage = '星空をもっと観察してみよう！'

    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-star-gold mb-2">結果発表</h2>
          <p className="text-star-white/60">{seasonMap[selectedSeason].label}</p>
        </div>

        {/* Score display */}
        <div className="text-center mb-8">
          <div className="inline-flex items-baseline gap-2 mb-4">
            <span className="text-6xl font-bold text-star-gold">{score}</span>
            <span className="text-2xl text-star-white/50">/ {total}</span>
          </div>
          <p className="text-xl text-star-white/80">{resultMessage}</p>
        </div>

        {/* Summary list */}
        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
          <h3 className="text-lg font-bold text-star-white mb-4">回答サマリー</h3>
          <div className="space-y-2">
            {questionQueue.map((c, i) => {
              const r = revealed.find((rv) => rv.id === c.id)
              const wasCorrect = r?.wasCorrect ?? false
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-star-white/40 text-sm w-6">{i + 1}.</span>
                    <span className="text-star-white">{c.name}</span>
                    <span className="text-star-white/30 text-sm">({c.latin})</span>
                  </div>
                  <span
                    className={wasCorrect ? 'text-success font-bold' : 'text-danger font-bold'}
                  >
                    {wasCorrect ? '正解' : '不正解'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <button onClick={startGame} className="btn-primary px-8 py-3">
            もう一度挑戦
          </button>
          <button onClick={() => setPhase('start')} className="btn-secondary px-8 py-3">
            季節を変える
          </button>
        </div>
      </div>
    )
  }

  // ══════════════════════════════
  //  Render: Playing phase
  // ══════════════════════════════
  const progress =
    questionQueue.length > 0 ? `${currentIndex + 1} / ${questionQueue.length}` : ''

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 py-4">
      {/* Top bar: progress + score + question prompt */}
      <div className="relative mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-star-white/50 text-sm font-bold">{progress}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-star-white/50 text-sm">スコア:</span>
            <span className="text-star-gold font-bold text-lg">{score}</span>
          </div>
        </div>

        {currentConstellation && (
          <div className="bg-space-800/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-center">
            <p className="text-lg sm:text-xl text-star-white font-bold">
              「{currentConstellation.name}」はどこにある？
            </p>
            {triesLeft < MAX_TRIES && triesLeft > 0 && (
              <p className="text-star-white/40 text-sm mt-1">
                あと{triesLeft}回チャンスがあるよ
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sky canvas */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden border border-white/10"
        style={{ cursor: waitingForNext ? 'default' : 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleCanvasClick}
          className="block w-full"
          style={{ height: canvasSize.height > 0 ? `${canvasSize.height}px` : 'auto' }}
        />

        {/* Toast overlay */}
        {showToast && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-2xl text-2xl font-bold pointer-events-none animate-fadeIn ${
              showToast === '正解!'
                ? 'bg-star-gold/20 text-star-gold border border-star-gold/40 shadow-[0_0_30px_rgba(255,215,0,0.3)]'
                : 'bg-danger/20 text-danger border border-danger/40'
            }`}
          >
            {showToast}
          </div>
        )}

        {/* Info card after reveal */}
        {showInfoCard && currentConstellation && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-space-800/95 backdrop-blur-sm border border-star-gold/30 rounded-xl px-5 py-3 max-w-sm text-center animate-slideUp pointer-events-none">
            <p className="text-star-gold font-bold text-lg mb-1">
              {currentConstellation.name}
              <span className="text-star-white/40 text-sm ml-2">
                ({currentConstellation.latin})
              </span>
            </p>
            <p className="text-star-white/60 text-sm">{currentConstellation.findingTip}</p>
          </div>
        )}
      </div>
    </div>
  )
}
