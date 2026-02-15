import { useState, useEffect, useRef, useCallback } from 'react'
import { constellations, type Constellation } from '../data/constellations'

// ---------- Canvas Drawing ----------

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

// ---------- Season helpers ----------

type Season = '全て' | '春' | '夏' | '秋' | '冬' | '周年'

const SEASONS: Season[] = ['全て', '春', '夏', '秋', '冬', '周年']

const SEASON_COLORS: Record<string, string> = {
  春: 'bg-green-600 text-white',
  夏: 'bg-blue-600 text-white',
  秋: 'bg-orange-500 text-white',
  冬: 'bg-cyan-500 text-white',
  周年: 'bg-purple-600 text-white',
}

const SEASON_BADGE_COLORS: Record<string, string> = {
  春: 'bg-green-600/80',
  夏: 'bg-blue-600/80',
  秋: 'bg-orange-500/80',
  冬: 'bg-cyan-500/80',
  周年: 'bg-purple-600/80',
}

function seasonPillClass(season: Season, active: boolean): string {
  if (!active) {
    return 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-white/5 text-star-white/60 hover:bg-white/10 hover:text-star-white border border-white/10'
  }
  if (season === '全て') {
    return 'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-star-gold text-space-900 border border-star-gold shadow-[0_0_12px_rgba(255,215,0,0.3)]'
  }
  return `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${SEASON_COLORS[season]} border border-transparent shadow-lg`
}

// ---------- Category helpers ----------

function getCategories(): string[] {
  const cats = new Set<string>()
  constellations.forEach(c => cats.add(c.category))
  return Array.from(cats).sort()
}

// ---------- Detail Modal ----------

function DetailModal({
  constellation,
  onClose,
}: {
  constellation: Constellation
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const seasonBadge = SEASON_BADGE_COLORS[constellation.season] || 'bg-white/20'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-space-800 border border-white/10 shadow-2xl animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-star-white text-xl transition-colors"
          aria-label="閉じる"
        >
          &times;
        </button>

        {/* Star pattern */}
        <div className="flex justify-center pt-8 pb-4">
          <div className="rounded-xl bg-space-900/60 p-4">
            <StarPattern
              constellation={constellation}
              width={320}
              height={240}
            />
          </div>
        </div>

        {/* Info */}
        <div className="px-8 pb-8 space-y-5">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-star-white">
              {constellation.nameKanji}
              <span className="ml-2 text-lg text-star-white/60">
                {constellation.name}
              </span>
            </h2>
            <p className="mt-1 text-star-blue text-sm">
              {constellation.latin}（{constellation.abbreviation}）
            </p>
          </div>

          {/* Season & Category badges */}
          <div className="flex justify-center gap-3 flex-wrap">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${seasonBadge}`}>
              {constellation.season}
            </span>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white bg-white/15">
              {constellation.category}
            </span>
          </div>

          {/* Brightest star & magnitude */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-star-white/50">最も明るい星</p>
              <p className="text-star-gold font-medium">{constellation.brightestStar}</p>
            </div>
            <div className="text-center">
              <p className="text-star-white/50">等級</p>
              <p className="text-star-gold font-medium">{constellation.magnitude}</p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-white/10" />

          {/* Mythology */}
          <div>
            <h3 className="text-sm font-bold text-star-blue mb-2">神話・由来</h3>
            <p className="text-sm text-star-white/80 leading-relaxed">
              {constellation.mythology}
            </p>
          </div>

          {/* Finding tip */}
          <div>
            <h3 className="text-sm font-bold text-star-blue mb-2">見つけ方</h3>
            <p className="text-sm text-star-white/80 leading-relaxed">
              {constellation.findingTip}
            </p>
          </div>

          {/* Keywords */}
          <div>
            <h3 className="text-sm font-bold text-star-blue mb-2">キーワード</h3>
            <div className="flex flex-wrap gap-2">
              {constellation.keywords.map(keyword => (
                <span
                  key={keyword}
                  className="inline-block px-3 py-1 rounded-full text-xs bg-star-gold/15 text-star-gold border border-star-gold/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- Constellation Card ----------

function ConstellationCard({
  constellation,
  onClick,
}: {
  constellation: Constellation
  onClick: () => void
}) {
  const seasonBadge = SEASON_BADGE_COLORS[constellation.season] || 'bg-white/20'

  return (
    <div className="game-card animate-fadeIn" onClick={onClick}>
      {/* Star pattern */}
      <div className="flex justify-center mb-4">
        <div className="rounded-lg bg-space-900/50 p-3">
          <StarPattern
            constellation={constellation}
            width={180}
            height={130}
          />
        </div>
      </div>

      {/* Name */}
      <h3 className="text-lg font-bold text-star-white text-center truncate">
        {constellation.nameKanji}
      </h3>
      <p className="text-xs text-star-blue text-center mt-1 truncate">
        {constellation.latin}
      </p>

      {/* Badges */}
      <div className="flex justify-center gap-2 mt-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${seasonBadge}`}>
          {constellation.season}
        </span>
        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-white/15">
          {constellation.category}
        </span>
      </div>
    </div>
  )
}

// ---------- Main Page ----------

export default function Encyclopedia() {
  const [search, setSearch] = useState('')
  const [seasonFilter, setSeasonFilter] = useState<Season>('全て')
  const [categoryFilter, setCategoryFilter] = useState<string>('全て')
  const [selected, setSelected] = useState<Constellation | null>(null)

  const categories = getCategories()

  const filtered = constellations.filter(c => {
    // Season filter
    if (seasonFilter !== '全て' && c.season !== seasonFilter) return false
    // Category filter
    if (categoryFilter !== '全て' && c.category !== categoryFilter) return false
    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const matchName = c.name.toLowerCase().includes(q)
      const matchKanji = c.nameKanji.includes(q)
      const matchLatin = c.latin.toLowerCase().includes(q)
      if (!matchName && !matchKanji && !matchLatin) return false
    }
    return true
  })

  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="text-center mb-8 animate-fadeIn">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
          星座図鑑
        </h1>
        <p className="mt-2 text-star-white/60 text-sm">
          全ての星座を探索しよう
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md mx-auto mb-6 animate-fadeIn">
        {/* Magnifying glass icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg
            className="w-5 h-5 text-star-white/40"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="星座名で検索（日本語・ラテン名）"
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-space-700 border border-white/10 text-star-white placeholder-star-white/40 focus:outline-none focus:border-star-gold/50 focus:ring-1 focus:ring-star-gold/30 transition-colors text-sm"
        />
      </div>

      {/* Season filter pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 animate-fadeIn">
        {SEASONS.map(season => (
          <button
            key={season}
            onClick={() => setSeasonFilter(season)}
            className={seasonPillClass(season, seasonFilter === season)}
          >
            {season}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fadeIn">
        <button
          onClick={() => setCategoryFilter('全て')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            categoryFilter === '全て'
              ? 'bg-star-gold text-space-900 border border-star-gold'
              : 'bg-white/5 text-star-white/60 hover:bg-white/10 hover:text-star-white border border-white/10'
          }`}
        >
          全て
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              categoryFilter === cat
                ? 'bg-star-gold text-space-900 border border-star-gold'
                : 'bg-white/5 text-star-white/60 hover:bg-white/10 hover:text-star-white border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-center text-star-white/40 text-xs mb-6">
        {filtered.length} 件の星座が見つかりました
      </p>

      {/* Constellation grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(c => (
            <ConstellationCard
              key={c.id}
              constellation={c}
              onClick={() => setSelected(c)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-star-white/40 text-lg">該当する星座が見つかりません</p>
          <p className="text-star-white/25 text-sm mt-2">検索条件を変更してみてください</p>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <DetailModal constellation={selected} onClose={handleClose} />
      )}
    </div>
  )
}
