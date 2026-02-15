import { useRef, useEffect } from 'react'

interface Star {
  x: number
  y: number
  radius: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

export default function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      initStars()
    }

    function initStars() {
      const count = Math.floor((canvas!.width * canvas!.height) / 8000)
      const stars: Star[] = []

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          radius: Math.random() * 1.5 + 0.3,
          opacity: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinkleOffset: Math.random() * Math.PI * 2,
        })
      }

      starsRef.current = stars
    }

    function draw(time: number) {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const star of starsRef.current) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset)
        const currentOpacity = star.opacity * (0.5 + 0.5 * twinkle)

        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 240, 255, ${currentOpacity})`
        ctx.fill()

        // Add a subtle glow for brighter stars
        if (star.radius > 1.2) {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(240, 240, 255, ${currentOpacity * 0.15})`
          ctx.fill()
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    resize()
    animationRef.current = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  )
}
