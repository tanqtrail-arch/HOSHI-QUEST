import { Link } from 'react-router-dom'

interface GameInfo {
  path: string
  name: string
  description: string
}

interface Category {
  icon: string
  title: string
  games: GameInfo[]
}

const categories: Category[] = [
  {
    icon: '\u{1F4DA}',
    title: '\u77E5\u8B58\u3092\u300C\u5165\u308C\u308B\u300D\u7CFB',
    games: [
      {
        path: '/detective',
        name: '\u661F\u5EA7\u63A2\u5075',
        description: '\u30D2\u30F3\u30C8\u3092\u6BB5\u968E\u7684\u306B\u3081\u304F\u3063\u3066\u63A8\u7406',
      },
      {
        path: '/flashcards',
        name: '\u661F\u5EA7\u30D5\u30E9\u30C3\u30B7\u30E5\u30AB\u30FC\u30C9',
        description: '\u30B9\u30EF\u30A4\u30D7\u3067\u6697\u8A18',
      },
      {
        path: '/encyclopedia',
        name: '\u661F\u5EA7\u56F3\u9451',
        description: '\u5168\u661F\u5EA7\u306E\u30EA\u30D5\u30A1\u30EC\u30F3\u30B9',
      },
    ],
  },
  {
    icon: '\u26A1',
    title: '\u30B9\u30D4\u30FC\u30C9\u30FB\u53CD\u5C04\u7CFB',
    games: [
      {
        path: '/speed-quiz',
        name: '\u661F\u5EA7\u65E9\u62BC\u3057\u30AF\u30A4\u30BA',
        description: '4\u629E\u3001\u5236\u9650\u6642\u9593\u3001\u30B3\u30F3\u30DC',
      },
      {
        path: '/typing-race',
        name: '\u661F\u5EA7\u30BF\u30A4\u30D4\u30F3\u30B0\u30EC\u30FC\u30B9',
        description: '\u30AD\u30FC\u30DC\u30FC\u30C9\u5165\u529B',
      },
    ],
  },
  {
    icon: '\u{1F5FA}\uFE0F',
    title: '\u4F4D\u7F6E\u30FB\u7A7A\u9593\u8A8D\u8B58\u7CFB',
    games: [
      {
        path: '/sky-mapping',
        name: '\u661F\u7A7A\u30DE\u30C3\u30D4\u30F3\u30B0',
        description: '\u591C\u7A7A\u3067\u661F\u5EA7\u4F4D\u7F6E\u3092\u5F53\u3066\u308B',
      },
      {
        path: '/star-connect',
        name: '\u661F\u3064\u306A\u304E\u30D1\u30BA\u30EB',
        description: '\u7DDA\u3092\u3064\u306A\u3044\u3067\u661F\u5EA7\u5B8C\u6210',
      },
    ],
  },
  {
    icon: '\u{1F9E0}',
    title: '\u8A18\u61B6\u30FB\u30DE\u30C3\u30C1\u30F3\u30B0\u7CFB',
    games: [
      {
        path: '/memory-match',
        name: '\u661F\u5EA7\u795E\u7D4C\u8870\u5F31',
        description: '\u30AB\u30FC\u30C9\u30DA\u30A2\u30DE\u30C3\u30C1',
      },
      {
        path: '/chain-game',
        name: '\u661F\u5EA7\u3057\u308A\u3068\u308A\u30C1\u30A7\u30FC\u30F3',
        description: '\u9023\u60F3\u30C1\u30A7\u30FC\u30F3',
      },
    ],
  },
  {
    icon: '\u{1F3C6}',
    title: '\u7DCF\u5408\u30FB\u30C1\u30E3\u30EC\u30F3\u30B8\u7CFB',
    games: [
      {
        path: '/certification',
        name: '\u661F\u5EA7\u691C\u5B9A\u30C1\u30E3\u30EC\u30F3\u30B8',
        description: '\u7DCF\u5408\u30C6\u30B9\u30C8',
      },
    ],
  },
]

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero section */}
      <div className="text-center mb-16 animate-fadeIn">
        <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent">
          HOSHI QUEST
        </h1>
        <p className="text-xl text-star-white/60 mb-2">
          {'\u2014 \u661F\u5EA7\u30B2\u30FC\u30E0\u30B9\u30A4\u30FC\u30C8 \u2014'}
        </p>
        <p className="text-star-white/40 max-w-lg mx-auto">
          {'\u904A\u3073\u306A\u304C\u3089\u661F\u5EA7\u3092\u5B66\u3079\u308B10\u7A2E\u985E\u306E\u30B2\u30FC\u30E0\u3067\u3001\u661F\u7A7A\u30DE\u30B9\u30BF\u30FC\u3092\u76EE\u6307\u305D\u3046'}
        </p>
      </div>

      {/* Game categories */}
      <div className="space-y-12">
        {categories.map((category, catIndex) => (
          <section
            key={category.title}
            className="animate-slideUp"
            style={{ animationDelay: `${catIndex * 0.1}s`, animationFillMode: 'both' }}
          >
            {/* Category header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl" role="img" aria-hidden="true">
                {category.icon}
              </span>
              <h2 className="text-xl font-bold text-star-white">
                {category.title}
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            {/* Game cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.games.map((game) => (
                <Link
                  key={game.path}
                  to={game.path}
                  className="game-card group block no-underline"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-lg group-hover:bg-star-gold/10 transition-colors duration-300">
                      <span className="text-xl" role="img" aria-hidden="true">
                        {category.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-star-white group-hover:text-star-gold transition-colors duration-300">
                        {game.name}
                      </h3>
                      <p className="text-sm text-star-white/50 mt-1">
                        {game.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-star-gold">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer area */}
      <div className="text-center mt-20 pb-8">
        <p className="text-star-white/30 text-sm">
          {'\u5168\u0031\u0030\u30B2\u30FC\u30E0\u3067\u661F\u5EA7\u306E\u77E5\u8B58\u3092\u6975\u3081\u3088\u3046'}
        </p>
      </div>
    </div>
  )
}
