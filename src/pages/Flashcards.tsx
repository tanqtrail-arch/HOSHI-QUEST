import { useState, useRef, useEffect, useCallback } from 'react'
import { constellations, type Constellation } from '../data/constellations'

type Season = '全て' | '春' | '夏' | '秋' | '冬' | '周年'
type Phase = 'start' | 'playing' | 'summary'

interface CardState {
  constellation: Constellation
  attempts: number
}

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

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function Flashcards() {
  const [phase, setPhase] = useState<Phase>('start')
  const [seasonFilter, setSeasonFilter] = useState<Season>('全て')
  const [deck, setDeck] = useState<CardState[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [totalCards, setTotalCards] = useState(0)
  const [completedCards, setCompletedCards] = useState<CardState[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const seasons: Season[] = ['全て', '春', '夏', '秋', '冬', '周年']

  const currentCard = deck[currentIndex] ?? null
  const remainingCount = deck.length - currentIndex
  const reviewInDeck = deck.slice(currentIndex).filter(c => c.attempts > 0).length

  const drawCurrentCard = useCallback(() => {
    if (canvasRef.current && currentCard) {
      drawConstellation(canvasRef.current, currentCard.constellation)
    }
  }, [currentCard])

  useEffect(() => {
    drawCurrentCard()
  }, [drawCurrentCard])

  function startGame() {
    const filtered = seasonFilter === '全て'
      ? constellations
      : constellations.filter(c => c.season === seasonFilter)

    const cards: CardState[] = shuffle(filtered).map(c => ({
      constellation: c,
      attempts: 0,
    }))

    setDeck(cards)
    setTotalCards(cards.length)
    setCurrentIndex(0)
    setFlipped(false)
    setCompletedCards([])
    setReviewCount(0)
    setPhase('playing')
  }

  function handleFlip() {
    if (!flipped) {
      setFlipped(true)
    }
  }

  function handleGotIt() {
    if (!currentCard) return
    setCompletedCards(prev => [...prev, currentCard])
    advanceCard()
  }

  function handleAgain() {
    if (!currentCard) return
    setReviewCount(prev => prev + 1)
    // Put the card back at the end of the deck with incremented attempts
    setDeck(prev => {
      const updated = [...prev]
      updated.push({ ...currentCard, attempts: currentCard.attempts + 1 })
      return updated
    })
    advanceCard()
  }

  function advanceCard() {
    const nextIndex = currentIndex + 1
    if (nextIndex >= deck.length && deck.length === currentIndex + 1) {
      // Check if there are cards added after current position
      // We need to re-check deck length after potential additions from handleAgain
      setTimeout(() => {
        setCurrentIndex(prev => {
          const newIdx = prev + 1
          if (newIdx >= deck.length) {
            setPhase('summary')
          }
          return newIdx
        })
        setFlipped(false)
      }, 0)
    } else {
      setCurrentIndex(nextIndex)
      setFlipped(false)
    }
  }

  // Check if we've reached the end when currentIndex changes
  useEffect(() => {
    if (phase === 'playing' && currentIndex >= deck.length && deck.length > 0) {
      setPhase('summary')
    }
  }, [currentIndex, deck.length, phase])

  const multipleAttemptCards = completedCards.filter(c => c.attempts > 0)

  // --- Start Screen ---
  if (phase === 'start') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
            星座フラッシュカード
          </h1>
          <p className="text-star-white/60 text-sm">
            星の並びから星座を覚えよう
          </p>
        </div>

        <div className="game-card mb-8">
          <h2 className="text-lg font-bold mb-4 text-star-white">季節を選択</h2>
          <div className="grid grid-cols-3 gap-2">
            {seasons.map(season => (
              <button
                key={season}
                onClick={() => setSeasonFilter(season)}
                className={`py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${
                  seasonFilter === season
                    ? 'bg-star-gold/20 text-star-gold border border-star-gold/50'
                    : 'bg-white/5 text-star-white/60 border border-white/10 hover:bg-white/10 hover:text-star-white'
                }`}
              >
                {season}
              </button>
            ))}
          </div>
          <p className="text-star-white/40 text-xs mt-3 text-center">
            {seasonFilter === '全て'
              ? `全 ${constellations.length} 星座`
              : `${constellations.filter(c => c.season === seasonFilter).length} 星座`
            }
          </p>
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

  // --- Summary Screen ---
  if (phase === 'summary') {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">&#127775;</div>
          <h1 className="text-2xl font-bold mb-2 text-star-gold">
            おつかれさまでした！
          </h1>
          <p className="text-star-white/60">
            全てのカードを覚えました
          </p>
        </div>

        <div className="game-card mb-6">
          <h2 className="text-lg font-bold mb-4 text-star-white text-center">結果</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">学習した星座</span>
              <span className="text-star-gold font-bold text-lg">{totalCards} 個</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">一発で覚えた</span>
              <span className="text-success font-bold text-lg">
                {completedCards.filter(c => c.attempts === 0).length} 個
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-star-white/70">復習が必要だった</span>
              <span className="text-danger font-bold text-lg">
                {multipleAttemptCards.length} 個
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-star-white/70">総復習回数</span>
              <span className="text-warning font-bold text-lg">{reviewCount} 回</span>
            </div>
          </div>
        </div>

        {multipleAttemptCards.length > 0 && (
          <div className="game-card mb-6">
            <h3 className="text-sm font-bold mb-3 text-star-white/70">復習した星座</h3>
            <div className="flex flex-wrap gap-2">
              {multipleAttemptCards.map((card, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs bg-danger/20 text-danger border border-danger/30"
                >
                  {card.constellation.name}（{card.attempts}回）
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setPhase('start')
            }}
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

  // --- Playing Screen ---
  return (
    <div className="max-w-sm mx-auto px-4 py-6 animate-fadeIn">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-star-white/50">進捗</span>
          <span className="text-xs text-star-white/50">
            {completedCards.length} / {totalCards}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-star-blue to-star-gold rounded-full transition-all duration-500"
            style={{ width: `${(completedCards.length / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Counter */}
      <div className="text-center mb-4">
        <span className="text-sm text-star-white/70">
          残り <span className="text-star-gold font-bold">{remainingCount}</span> 枚
          {reviewInDeck > 0 && (
            <> / 復習 <span className="text-danger font-bold">{reviewInDeck}</span> 枚</>
          )}
        </span>
      </div>

      {/* Card */}
      {currentCard && (
        <div
          className="relative w-full aspect-[3/4] cursor-pointer mb-6"
          style={{ perspective: '1000px' }}
          onClick={handleFlip}
        >
          <div
            className="relative w-full h-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front side */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #1a1a3e, #0f0f2e)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                className="mb-4"
              />
              {currentCard.attempts > 0 && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs bg-danger/20 text-danger border border-danger/30">
                  復習中
                </span>
              )}
              <p className="text-star-white/40 text-xs">タップしてめくる</p>
            </div>

            {/* Back side */}
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'linear-gradient(135deg, #1a1a3e, #0f0f2e)',
                border: '1px solid rgba(255,215,0,0.3)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 15px rgba(255,215,0,0.1)',
              }}
            >
              <h2 className="text-3xl font-bold text-star-gold mb-2">
                {currentCard.constellation.name}
              </h2>
              <p className="text-star-white/50 text-sm italic mb-6">
                {currentCard.constellation.latin}
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-nebula-blue/20 text-nebula-blue border border-nebula-blue/30">
                  {currentCard.constellation.season}
                </span>
              </div>
              <div className="text-center">
                <p className="text-star-white/40 text-xs mb-1">最も明るい星</p>
                <p className="text-star-white text-lg font-bold">
                  {currentCard.constellation.brightestStar}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons (shown after flip) */}
      {flipped && currentCard && (
        <div className="flex gap-3 animate-fadeIn">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAgain()
            }}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30 active:scale-95"
          >
            もう一回
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleGotIt()
            }}
            className="flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer bg-success/20 text-success border border-success/40 hover:bg-success/30 active:scale-95"
          >
            覚えた！
          </button>
        </div>
      )}
    </div>
  )
}
