import { useState, useRef, useEffect, useCallback } from 'react'
import { constellations, getRandomConstellations, type Constellation } from '../data/constellations'

// ---------- Types ----------

type Phase = 'start' | 'playing' | 'complete'
type Difficulty = 'easy' | 'normal' | 'hard'

interface Card {
  id: string
  constellationId: string
  type: 'pattern' | 'name'
  isFlipped: boolean
  isMatched: boolean
}

interface DifficultyOption {
  key: Difficulty
  label: string
  pairs: number
  cols: number
  rows: number
}

const DIFFICULTIES: DifficultyOption[] = [
  { key: 'easy', label: 'かんたん', pairs: 6, cols: 4, rows: 3 },
  { key: 'normal', label: 'ふつう', pairs: 8, cols: 4, rows: 4 },
  { key: 'hard', label: 'むずかしい', pairs: 12, cols: 4, rows: 6 },
]

// ---------- Helpers ----------

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getRating(attempts: number, pairs: number): { label: string; color: string } {
  if (attempts <= pairs * 1.5) return { label: '素晴らしい！', color: 'text-star-gold' }
  if (attempts <= pairs * 2) return { label: 'とても良い！', color: 'text-success' }
  if (attempts <= pairs * 2.5) return { label: '良い！', color: 'text-star-blue' }
  return { label: 'もう一回挑戦！', color: 'text-star-white/70' }
}

// ---------- Constellation drawing ----------

function drawConstellation(canvas: HTMLCanvasElement, constellation: Constellation) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const { width, height } = canvas
  ctx.clearRect(0, 0, width, height)

  // Draw connections
  ctx.strokeStyle = 'rgba(126, 200, 227, 0.5)'
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
    const size = Math.max(1.5, 5 - star.magnitude)
    const sx = star.x * width / 100
    const sy = star.y * height / 100

    ctx.beginPath()
    ctx.arc(sx, sy, size, 0, Math.PI * 2)
    ctx.fillStyle = star.magnitude <= 2 ? '#ffd700' : '#f0f0ff'
    ctx.fill()

    // Glow
    if (star.magnitude <= 2) {
      ctx.beginPath()
      ctx.arc(sx, sy, size * 2.5, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.5)
      g.addColorStop(0, 'rgba(255,215,0,0.3)')
      g.addColorStop(1, 'transparent')
      ctx.fillStyle = g
      ctx.fill()
    }
  })
}

// ---------- Star Pattern Card Canvas ----------

function StarPatternCanvas({
  constellation,
  size,
}: {
  constellation: Constellation
  size: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = size
    canvas.height = size
    drawConstellation(canvas, constellation)
  }, [constellation, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
    />
  )
}

// ---------- Memory Card Component ----------

function MemoryCard({
  card,
  constellation,
  onClick,
  disabled,
  cardSize,
}: {
  card: Card
  constellation: Constellation
  onClick: () => void
  disabled: boolean
  cardSize: number
}) {
  const isRevealed = card.isFlipped || card.isMatched
  const canvasSize = Math.max(40, cardSize - 32)

  return (
    <div
      className="relative"
      style={{
        perspective: '600px',
        width: `${cardSize}px`,
        height: `${cardSize}px`,
      }}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 cursor-pointer ${
          !disabled && !isRevealed ? 'hover:-translate-y-1' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
        onClick={() => {
          if (!disabled && !isRevealed) onClick()
        }}
      >
        {/* Front - face down */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #1a1a3e, #0f0f2e)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {/* Sparkle pattern on card back */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 2L23 15L36 12L25 20L36 28L23 25L20 38L17 25L4 28L15 20L4 12L17 15L20 2Z" fill="#ffd700" />
            </svg>
          </div>
          <div className="absolute inset-0 opacity-10"
            style={{
              background: 'radial-gradient(circle at 30% 20%, rgba(255,215,0,0.3), transparent 50%), radial-gradient(circle at 70% 80%, rgba(126,200,227,0.3), transparent 50%)',
            }}
          />
        </div>

        {/* Back - face up content */}
        <div
          className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center overflow-hidden ${
            card.isMatched
              ? 'ring-2 ring-star-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
              : ''
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: card.isMatched
              ? 'linear-gradient(135deg, #1f1f40, #151535)'
              : 'linear-gradient(135deg, #1a1a3e, #0f0f2e)',
            border: card.isMatched
              ? '2px solid rgba(255,215,0,0.5)'
              : '1px solid rgba(126,200,227,0.3)',
            boxShadow: card.isMatched
              ? '0 6px 20px rgba(255,215,0,0.15)'
              : '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {card.type === 'pattern' ? (
            <StarPatternCanvas constellation={constellation} size={canvasSize} />
          ) : (
            <span
              className="font-bold text-star-white text-center px-1 leading-tight"
              style={{
                fontSize: `${Math.max(10, Math.min(16, cardSize / 6))}px`,
              }}
            >
              {constellation.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- Main Component ----------

export default function MemoryMatch() {
  const [phase, setPhase] = useState<Phase>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [cards, setCards] = useState<Card[]>([])
  const [selectedConstellations, setSelectedConstellations] = useState<Constellation[]>([])
  const [flippedCards, setFlippedCards] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [celebratingMatch, setCelebratingMatch] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const difficultyOption = DIFFICULTIES.find(d => d.key === difficulty)!
  const totalPairs = difficultyOption.pairs

  // Timer
  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [phase])

  // Build constellation lookup map
  const constellationMap = useCallback(() => {
    const map = new Map<string, Constellation>()
    selectedConstellations.forEach(c => map.set(c.id, c))
    return map
  }, [selectedConstellations])

  // Start game
  function startGame() {
    const selected = getRandomConstellations(totalPairs)
    setSelectedConstellations(selected)

    // Create card pairs: one pattern card + one name card per constellation
    const newCards: Card[] = []
    selected.forEach(c => {
      newCards.push({
        id: `${c.id}-pattern`,
        constellationId: c.id,
        type: 'pattern',
        isFlipped: false,
        isMatched: false,
      })
      newCards.push({
        id: `${c.id}-name`,
        constellationId: c.id,
        type: 'name',
        isFlipped: false,
        isMatched: false,
      })
    })

    setCards(shuffle(newCards))
    setFlippedCards([])
    setAttempts(0)
    setMatchedPairs(0)
    setElapsedTime(0)
    setIsChecking(false)
    setCelebratingMatch(null)
    setPhase('playing')
  }

  // Handle card click
  function handleCardClick(cardId: string) {
    if (isChecking) return
    if (flippedCards.length >= 2) return

    const card = cards.find(c => c.id === cardId)
    if (!card || card.isFlipped || card.isMatched) return

    // Flip the card
    const updatedCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    )
    setCards(updatedCards)

    const newFlipped = [...flippedCards, cardId]
    setFlippedCards(newFlipped)

    // If two cards are flipped, check for match
    if (newFlipped.length === 2) {
      setAttempts(prev => prev + 1)
      setIsChecking(true)

      const [firstId, secondId] = newFlipped
      const firstCard = updatedCards.find(c => c.id === firstId)!
      const secondCard = updatedCards.find(c => c.id === secondId)!

      if (
        firstCard.constellationId === secondCard.constellationId &&
        firstCard.type !== secondCard.type
      ) {
        // Match found
        setCelebratingMatch(firstCard.constellationId)
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.constellationId === firstCard.constellationId
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          )
          setMatchedPairs(prev => {
            const next = prev + 1
            if (next >= totalPairs) {
              // Game complete - small delay for animation
              setTimeout(() => setPhase('complete'), 600)
            }
            return next
          })
          setFlippedCards([])
          setIsChecking(false)
          setTimeout(() => setCelebratingMatch(null), 300)
        }, 800)
      } else {
        // No match - flip back after delay
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              newFlipped.includes(c.id) && !c.isMatched
                ? { ...c, isFlipped: false }
                : c
            )
          )
          setFlippedCards([])
          setIsChecking(false)
        }, 1500)
      }
    }
  }

  // Calculate card size based on grid
  function getCardSize(): number {
    // Responsive card size: aim for fitting in viewport
    const maxWidth = Math.min(640, typeof window !== 'undefined' ? window.innerWidth - 48 : 640)
    const gap = 8
    const cols = difficultyOption.cols
    return Math.floor((maxWidth - gap * (cols - 1)) / cols)
  }

  const cMap = constellationMap()

  // ---------- Start Screen ----------
  if (phase === 'start') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星座神経衰弱
          </h1>
          <p className="text-star-white/60 text-sm">
            星の並びと名前のペアを見つけよう
          </p>
        </div>

        <div className="game-card mb-8">
          <h2 className="text-lg font-bold mb-4 text-star-white">難易度を選択</h2>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={`py-3 px-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                  difficulty === d.key
                    ? 'bg-star-gold/20 text-star-gold border border-star-gold/50'
                    : 'bg-white/5 text-star-white/60 border border-white/10 hover:bg-white/10 hover:text-star-white'
                }`}
              >
                <div>{d.label}</div>
                <div className="text-xs mt-1 opacity-70">{d.pairs}ペア</div>
              </button>
            ))}
          </div>
          <p className="text-star-white/40 text-xs mt-3 text-center">
            {difficultyOption.pairs}ペア（{difficultyOption.pairs * 2}枚）/ {difficultyOption.cols}×{difficultyOption.rows}
          </p>
        </div>

        <div className="game-card mb-8">
          <h2 className="text-sm font-bold mb-3 text-star-white/70">遊び方</h2>
          <ul className="space-y-2 text-sm text-star-white/60">
            <li className="flex gap-2">
              <span className="text-star-gold">1.</span>
              <span>カードを2枚めくります</span>
            </li>
            <li className="flex gap-2">
              <span className="text-star-gold">2.</span>
              <span>星の並びと星座名が一致すればペア成立</span>
            </li>
            <li className="flex gap-2">
              <span className="text-star-gold">3.</span>
              <span>一致しなければカードは裏に戻ります</span>
            </li>
            <li className="flex gap-2">
              <span className="text-star-gold">4.</span>
              <span>全ペアを見つけたらクリア！</span>
            </li>
          </ul>
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

  // ---------- Complete Screen ----------
  if (phase === 'complete') {
    const rating = getRating(attempts, totalPairs)
    const diffLabel = DIFFICULTIES.find(d => d.key === difficulty)!.label

    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">&#127775;</div>
          <h1 className="text-3xl font-bold mb-2 text-star-gold">
            クリア！
          </h1>
          <p className={`text-xl font-bold ${rating.color}`}>
            {rating.label}
          </p>
        </div>

        <div className="game-card mb-6">
          <h2 className="text-lg font-bold mb-4 text-star-white text-center">結果</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">難易度</span>
              <span className="text-star-white font-bold">{diffLabel}（{totalPairs}ペア）</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">試行回数</span>
              <span className="text-star-gold font-bold text-lg">{attempts} 回</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">所要時間</span>
              <span className="text-star-blue font-bold text-lg">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-star-white/70">評価</span>
              <span className={`font-bold text-lg ${rating.color}`}>{rating.label}</span>
            </div>
          </div>
        </div>

        {/* Revealed constellations */}
        <div className="game-card mb-6">
          <h3 className="text-sm font-bold mb-3 text-star-white/70 text-center">見つけた星座</h3>
          <div className="grid grid-cols-3 gap-3">
            {selectedConstellations.map(c => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <div className="rounded-lg bg-space-900/50 p-2">
                  <StarPatternCanvas constellation={c} size={50} />
                </div>
                <span className="text-xs text-star-white/80 text-center leading-tight">
                  {c.name}
                </span>
              </div>
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
          <button
            onClick={startGame}
            className="btn-primary flex-1 py-3"
          >
            もう一度
          </button>
        </div>
      </div>
    )
  }

  // ---------- Playing Screen ----------
  const cardSize = getCardSize()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-fadeIn">
      {/* Header stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-star-white/70">
          試行回数: <span className="text-star-gold font-bold">{attempts}</span>
        </div>
        <div className="text-sm text-star-white/70">
          <span className="text-star-blue font-bold">{formatTime(elapsedTime)}</span>
        </div>
        <div className="text-sm text-star-white/70">
          <span className="text-success font-bold">{matchedPairs}</span> / {totalPairs} ペア
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-star-blue to-star-gold rounded-full transition-all duration-500"
          style={{ width: `${(matchedPairs / totalPairs) * 100}%` }}
        />
      </div>

      {/* Card grid */}
      <div
        className="grid justify-center mx-auto"
        style={{
          gridTemplateColumns: `repeat(${difficultyOption.cols}, ${cardSize}px)`,
          gap: '8px',
          width: 'fit-content',
        }}
      >
        {cards.map(card => {
          const constellation = cMap.get(card.constellationId)
          if (!constellation) return null

          return (
            <div
              key={card.id}
              className={`transition-transform duration-300 ${
                celebratingMatch === card.constellationId ? 'scale-105' : ''
              } ${card.isMatched ? 'translate-y-[-2px]' : ''}`}
            >
              <MemoryCard
                card={card}
                constellation={constellation}
                onClick={() => handleCardClick(card.id)}
                disabled={isChecking || flippedCards.length >= 2}
                cardSize={cardSize}
              />
            </div>
          )
        })}
      </div>

      {/* Match celebration overlay */}
      {celebratingMatch && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="text-star-gold text-2xl font-bold animate-fadeIn opacity-80">
            ペア成立！
          </div>
        </div>
      )}
    </div>
  )
}
