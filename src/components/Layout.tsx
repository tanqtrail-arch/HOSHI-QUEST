import { Link, useLocation } from 'react-router-dom'
import StarCanvas from './StarCanvas'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="relative min-h-screen font-jp">
      {/* CSS starfield background */}
      <div className="starfield" />

      {/* Canvas starfield for extra depth */}
      <StarCanvas />

      {/* Navigation bar */}
      <nav className="relative z-20 border-b border-white/10 bg-space-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Home link */}
            <Link
              to="/"
              className="flex items-center gap-3 group"
            >
              <span className="text-2xl" role="img" aria-label="star">
                &#11088;
              </span>
              <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-star-gold via-star-white to-star-blue bg-clip-text text-transparent group-hover:from-star-blue group-hover:via-star-gold group-hover:to-star-white transition-all duration-500">
                HOSHI QUEST
              </span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-4">
              {!isHome && (
                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-star-white/70 hover:text-star-white hover:bg-white/5 transition-all duration-200"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"
                    />
                  </svg>
                  <span>ホームへ戻る</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  )
}
