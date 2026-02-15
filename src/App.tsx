import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout'

const Home = React.lazy(() => import('./pages/Home'))
const Detective = React.lazy(() => import('./pages/Detective'))
const Flashcards = React.lazy(() => import('./pages/Flashcards'))
const Encyclopedia = React.lazy(() => import('./pages/Encyclopedia'))
const SpeedQuiz = React.lazy(() => import('./pages/SpeedQuiz'))
const TypingRace = React.lazy(() => import('./pages/TypingRace'))
const SkyMapping = React.lazy(() => import('./pages/SkyMapping'))
const StarConnect = React.lazy(() => import('./pages/StarConnect'))
const MemoryMatch = React.lazy(() => import('./pages/MemoryMatch'))
const ChainGame = React.lazy(() => import('./pages/ChainGame'))
const Certification = React.lazy(() => import('./pages/Certification'))

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-star-gold/30 border-t-star-gold rounded-full animate-spin mb-4" />
        <p className="text-star-white/60 text-lg font-jp">読み込み中...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/detective" element={<Detective />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/encyclopedia" element={<Encyclopedia />} />
          <Route path="/speed-quiz" element={<SpeedQuiz />} />
          <Route path="/typing-race" element={<TypingRace />} />
          <Route path="/sky-mapping" element={<SkyMapping />} />
          <Route path="/star-connect" element={<StarConnect />} />
          <Route path="/memory-match" element={<MemoryMatch />} />
          <Route path="/chain-game" element={<ChainGame />} />
          <Route path="/certification" element={<Certification />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
