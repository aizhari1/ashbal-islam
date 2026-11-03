'use client'

import { useEffect, useRef, useState } from 'react'

/** يظهر العنصر بحركة عند الوصول إليه بالسكرول */
export function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`lp-reveal ${on ? 'in' : ''} ${className}`} style={{ ['--d' as any]: `${delay}ms` }}>{children}</div>
}

/** عدّاد أرقام متحرك */
export function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      if (reduce) return setN(value)
      const t0 = performance.now(), dur = 1600
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur)
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value])
  return <span ref={ref} dir="ltr">{n.toLocaleString('en-US')}{suffix}</span>
}
