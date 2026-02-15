import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { constellations, type Constellation } from '../data/constellations'

// ---------- Helpers ----------

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function drawConstellation(canvas: HTMLCanvasElement, constellation: Constellation) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)
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
  constellation.stars.forEach(star => {
    const size = Math.max(2, 6 - star.magnitude)
    const sx = star.x * width / 100
    const sy = star.y * height / 100
    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fillStyle = star.magnitude <= 2 ? '#ffd700' : '#f0f0ff'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(sx, sy, size * 2, 0, Math.PI * 2)
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2)
    g.addColorStop(0, 'rgba(255,255,255,0.3)')
    g.addColorStop(1, 'transparent')
    ctx.fillStyle = g
    ctx.fill()
  })
}

// ---------- Star Pattern Canvas Component ----------

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

// ---------- Connection Logic ----------

interface ConnectionResult {
  constellation: Constellation
  reason: string
}

function findConnectedConstellations(
  current: Constellation,
  used: Set<string>,
): ConnectionResult[] {
  return constellations
    .filter(c => c.id !== current.id && !used.has(c.id))
    .filter(c => {
      const shared = c.keywords.some(k => current.keywords.includes(k))
      const sameSeason = c.season === current.season
      return shared || sameSeason
    })
    .map(c => {
      const sharedKeyword = c.keywords.find(k => current.keywords.includes(k))
      const reason = sharedKeyword
        ? `「${sharedKeyword}」でつながった！`
        : `同じ${current.season}の星座！`
      return { constellation: c, reason }
    })
}

function pickChoices(
  connected: ConnectionResult[],
  used: Set<string>,
  count: number,
): { correct: ConnectionResult; choices: Constellation[] } | null {
  if (connected.length === 0) return null

  // Prefer keyword connections over season-only connections
  const keywordConnections = connected.filter(c => !c.reason.startsWith('同じ'))
  const pool = keywordConnections.length > 0 ? keywordConnections : connected
  const correct = pool[Math.floor(Math.random() * pool.length)]

  // Get wrong choices: constellations that are NOT connected
  const unconnected = constellations
    .filter(c =>
      c.id !== correct.constellation.id &&
      !used.has(c.id) &&
      !connected.some(conn => conn.constellation.id === c.id),
    )

  const wrongChoices = shuffle(unconnected).slice(0, count - 1)
  const allChoices = shuffle([correct.constellation, ...wrongChoices.map(c => c)])

  return { correct, choices: allChoices }
}

// ---------- Season Colors ----------

const SEASON_BADGE_COLORS: Record<string, string> = {
  春: 'bg-green-600/80',
  夏: 'bg-blue-600/80',
  秋: 'bg-orange-500/80',
  冬: 'bg-cyan-500/80',
  周年: 'bg-purple-600/80',
}

// ---------- Types ----------

type Phase = 'start' | 'playing' | 'result'

interface ChainNode {
  constellation: Constellation
  reason: string | null // null for the first node
}

// ---------- Chain Visualization ----------

function ChainDisplay({ chain, activeIndex }: { chain: ChainNode[]; activeIndex: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [chain.length])

  if (chain.length === 0) return null

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1 overflow-x-auto pb-2 px-2 scrollbar-hide"
      style={{ scrollBehavior: 'smooth' }}
    >
      {chain.map((node, i) => (
        <div key={node.constellation.id} className="flex items-center shrink-0">
          {/* Connection line + reason */}
          {i > 0 && (
            <div className="flex items-center mx-1">
              <div className="w-6 h-0.5 bg-star-gold/40" />
              <div className="text-star-gold text-[10px] mx-0.5">&#9830;</div>
              <div className="w-6 h-0.5 bg-star-gold/40" />
            </div>
          )}
          {/* Node */}
          <div
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-300 ${
              i === activeIndex
                ? 'border-star-gold bg-star-gold/20 shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                : 'border-star-blue/40 bg-space-700/80'
            }`}
            title={node.reason ?? '最初の星座'}
          >
            <span className="text-[10px] text-star-white font-bold text-center leading-tight px-0.5 truncate max-w-[3rem]">
              {node.constellation.name.replace('座', '')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Toast Component ----------

function Toast({
  message,
  type,
  onDone,
}: {
  message: string
  type: 'success' | 'error'
  onDone: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-bold shadow-2xl animate-fadeIn ${
        type === 'success'
          ? 'bg-success/90 text-white border border-success'
          : 'bg-danger/90 text-white border border-danger'
      }`}
    >
      {message}
    </div>
  )
}

// ---------- Main Component ----------

export default function ChainGame() {
  const [phase, setPhase] = useState<Phase>('start')
  const [chain, setChain] = useState<ChainNode[]>([])
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set())
  const [lives, setLives] = useState(3)
  const [choices, setChoices] = useState<Constellation[]>([])
  const [correctAnswer, setCorrectAnswer] = useState<ConnectionResult | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [shaking, setShaking] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showingResult, setShowingResult] = useState(false)
  const [bestChain, setBestChain] = useState(0)

  const currentConstellation = chain.length > 0 ? chain[chain.length - 1].constellation : null

  // Generate next round of choices when chain changes
  const generateChoices = useCallback(
    (current: Constellation, used: Set<string>) => {
      const connected = findConnectedConstellations(current, used)
      const result = pickChoices(connected, used, 4)

      if (!result) {
        // No more valid connections - game over
        setPhase('result')
        return
      }

      setCorrectAnswer(result.correct)
      setChoices(result.choices)
      setSelectedId(null)
      setShowingResult(false)
    },
    [],
  )

  // Start game
  function startGame() {
    const starter = constellations[Math.floor(Math.random() * constellations.length)]
    const initialUsed = new Set([starter.id])
    const initialChain: ChainNode[] = [{ constellation: starter, reason: null }]

    setChain(initialChain)
    setUsedIds(initialUsed)
    setLives(3)
    setToast(null)
    setShaking(false)
    setSelectedId(null)
    setShowingResult(false)
    setPhase('playing')

    // Generate choices for the starter
    generateChoices(starter, initialUsed)
  }

  // Handle player choosing a constellation
  function handleChoice(chosen: Constellation) {
    if (showingResult || !correctAnswer) return

    setSelectedId(chosen.id)
    setShowingResult(true)

    if (chosen.id === correctAnswer.constellation.id) {
      // Correct!
      const reason = correctAnswer.reason
      setToast({ message: reason, type: 'success' })

      const newNode: ChainNode = { constellation: chosen, reason }
      const newChain = [...chain, newNode]
      const newUsed = new Set(usedIds)
      newUsed.add(chosen.id)

      setChain(newChain)
      setUsedIds(newUsed)

      // After a brief delay, generate next choices
      setTimeout(() => {
        generateChoices(chosen, newUsed)
      }, 1200)
    } else {
      // Wrong!
      const newLives = lives - 1
      setLives(newLives)
      setShaking(true)
      setToast({ message: 'つながらなかった...', type: 'error' })

      setTimeout(() => setShaking(false), 400)

      if (newLives <= 0) {
        // Game over
        setTimeout(() => {
          setPhase('result')
        }, 1500)
      } else {
        // Continue with next choices (same current constellation)
        setTimeout(() => {
          if (currentConstellation) {
            generateChoices(currentConstellation, usedIds)
          }
        }, 1500)
      }
    }
  }

  // Update best chain
  useEffect(() => {
    if (phase === 'result' && chain.length > bestChain) {
      setBestChain(chain.length)
    }
  }, [phase, chain.length, bestChain])

  // Hearts display
  const heartsDisplay = useMemo(() => {
    return Array.from({ length: 3 }, (_, i) => (
      <span
        key={i}
        className={`text-xl transition-all duration-300 ${
          i < lives
            ? 'text-danger opacity-100 scale-100'
            : 'text-star-white/20 opacity-50 scale-75'
        }`}
      >
        &#9829;
      </span>
    ))
  }, [lives])

  // ---------- Start Screen ----------
  if (phase === 'start') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星座しりとりチェーン
          </h1>
          <p className="text-star-white/60 text-sm">
            星座のつながりを見つけて、チェーンを伸ばそう
          </p>
        </div>

        <div className="game-card mb-8 cursor-default">
          <h2 className="text-lg font-bold mb-4 text-star-white text-center">
            遊び方
          </h2>
          <div className="space-y-3 text-sm text-star-white/70">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-star-gold/20 text-star-gold text-xs font-bold">
                1
              </span>
              <p>星座が表示されます。キーワードや季節を確認しましょう。</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-star-gold/20 text-star-gold text-xs font-bold">
                2
              </span>
              <p>表示された選択肢の中から、今の星座とつながりのある星座を選びます。</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-star-gold/20 text-star-gold text-xs font-bold">
                3
              </span>
              <p>つながりとは：同じキーワードを持つ、同じ季節の星座などです。</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-star-gold/20 text-star-gold text-xs font-bold">
                4
              </span>
              <p>正解するとチェーンが伸びます。間違えるとライフが減ります。</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-danger/20 text-danger text-xs font-bold">
                !
              </span>
              <p>ライフは ♥♥♥ の3つ。0になるとゲーム終了です。</p>
            </div>
          </div>
        </div>

        {bestChain > 0 && (
          <div className="text-center mb-6">
            <p className="text-star-white/40 text-xs">
              ベスト記録：<span className="text-star-gold font-bold">{bestChain}</span> 星座チェーン
            </p>
          </div>
        )}

        <button onClick={startGame} className="btn-primary w-full text-lg py-4">
          スタート
        </button>
      </div>
    )
  }

  // ---------- Result Screen ----------
  if (phase === 'result') {
    const chainReasons = chain
      .filter(n => n.reason)
      .map(n => n.reason!)

    const longestReason =
      chainReasons.length > 0
        ? chainReasons.reduce((a, b) => (a.length >= b.length ? a : b))
        : null

    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">
            {chain.length >= 8 ? '\u{1F31F}' : chain.length >= 5 ? '\u{2B50}' : '\u{1F320}'}
          </div>
          <h1 className="text-2xl font-bold mb-2 text-star-gold">
            ゲーム終了！
          </h1>
          <p className="text-star-white/60">
            {chain.length >= 8
              ? '素晴らしいチェーンを作りました！'
              : chain.length >= 5
                ? 'なかなかのチェーンです！'
                : 'もっとつなげてみよう！'}
          </p>
        </div>

        <div className="game-card mb-6 cursor-default">
          <h2 className="text-lg font-bold mb-4 text-star-white text-center">
            結果
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">チェーンの長さ</span>
              <span className="text-star-gold font-bold text-lg">
                {chain.length} 星座
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">残りライフ</span>
              <span className="text-danger font-bold text-lg">
                {'♥'.repeat(lives)}{'♡'.repeat(3 - lives)}
              </span>
            </div>
            {longestReason && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-star-white/70">ベストつながり</span>
                <span className="text-star-blue font-bold text-sm">
                  {longestReason}
                </span>
              </div>
            )}
            {chain.length > bestChain && (
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-star-white/70">ベスト記録</span>
                <span className="text-star-gold font-bold text-lg">
                  新記録！
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chain journey */}
        <div className="game-card mb-6 cursor-default">
          <h3 className="text-sm font-bold mb-3 text-star-white/70">
            チェーンの旅路
          </h3>
          <div className="space-y-2">
            {chain.map((node, i) => (
              <div key={node.constellation.id} className="flex items-center gap-2">
                <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-star-gold/20 text-star-gold text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-sm text-star-white font-medium">
                  {node.constellation.name}
                </span>
                {node.reason && (
                  <span className="text-xs text-star-blue/70 truncate">
                    - {node.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('start')}
            className="btn-secondary flex-1 py-3"
          >
            タイトルに戻る
          </button>
          <button onClick={startGame} className="btn-primary flex-1 py-3">
            もう一度
          </button>
        </div>
      </div>
    )
  }

  // ---------- Playing Screen ----------
  if (!currentConstellation) return null

  const seasonBadge = SEASON_BADGE_COLORS[currentConstellation.season] || 'bg-white/20'

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <Toast
          key={toast.message + Date.now()}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* Top bar: lives + chain counter */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <span className="text-xs text-star-white/50 mr-1">ライフ</span>
          {heartsDisplay}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-star-white/50">チェーン:</span>
          <span className="text-lg font-bold text-star-gold">{chain.length}</span>
        </div>
      </div>

      {/* Chain visualization */}
      <div className="mb-4 bg-space-800/60 rounded-xl border border-white/5 py-3 px-1">
        <ChainDisplay chain={chain} activeIndex={chain.length - 1} />
      </div>

      {/* Current constellation card */}
      <div
        className={`game-card mb-6 cursor-default ${shaking ? 'animate-shake' : ''}`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Star pattern */}
          <div className="shrink-0 rounded-lg bg-space-900/50 p-3">
            <StarPattern
              constellation={currentConstellation}
              width={140}
              height={110}
            />
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-star-white mb-1">
              {currentConstellation.name}
            </h2>
            <p className="text-xs text-star-blue mb-3">
              {currentConstellation.latin}
            </p>

            {/* Season + brightest star */}
            <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${seasonBadge}`}
              >
                {currentConstellation.season}
              </span>
              <span className="text-xs text-star-white/50">
                &#9733; {currentConstellation.brightestStar}
              </span>
            </div>

            {/* Keywords */}
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
              {currentConstellation.keywords.map(keyword => (
                <span
                  key={keyword}
                  className="inline-block px-2.5 py-1 rounded-full text-xs bg-star-gold/15 text-star-gold border border-star-gold/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <p className="text-center text-star-white/50 text-sm mb-4">
        この星座とつながる星座はどれ？
      </p>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3">
        {choices.map(c => {
          const isSelected = selectedId === c.id
          const isCorrectChoice = correctAnswer?.constellation.id === c.id
          const showCorrect = showingResult && isCorrectChoice
          const showWrong = showingResult && isSelected && !isCorrectChoice

          let borderClass = 'border-white/10 hover:border-star-gold/40'
          let bgClass = 'bg-space-700/80 hover:bg-space-700'
          let nameClass = 'text-star-white'

          if (showCorrect) {
            borderClass = 'border-success'
            bgClass = 'bg-success/15'
            nameClass = 'text-success'
          } else if (showWrong) {
            borderClass = 'border-danger'
            bgClass = 'bg-danger/15'
            nameClass = 'text-danger'
          }

          return (
            <button
              key={c.id}
              onClick={() => handleChoice(c)}
              disabled={showingResult}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 cursor-pointer disabled:cursor-default ${borderClass} ${bgClass}`}
            >
              <div className="rounded-lg bg-space-900/50 p-2">
                <StarPattern
                  constellation={c}
                  width={80}
                  height={60}
                />
              </div>
              <span className={`text-sm font-bold ${nameClass}`}>
                {c.name}
              </span>
              <span className="text-[10px] text-star-white/40">
                {c.latin}
              </span>

              {/* Correct / Wrong indicator */}
              {showCorrect && (
                <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-success text-white text-xs font-bold">
                  &#10003;
                </span>
              )}
              {showWrong && (
                <span className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-danger text-white text-xs font-bold">
                  &#10007;
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
