'use client'

import { useEffect, useState } from 'react'

export default function AppBoot() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 900)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const routes = ['/login', '/admin', '/teacher', '/supervisor', '/student', '/admin/finance', '/admin/students']
    routes.forEach((href) => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = href
      document.head.appendChild(link)
    })

    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div
      id="app-splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity .35s ease',
      }}
    >
      <img
        src="/logo.png"
        alt="أشبال الإسلام"
        width={180}
        height={180}
        style={{ objectFit: 'contain', marginBottom: 16 }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).src = '/logo.svg'
        }}
      />
      <p style={{ color: '#0B6B3A', fontWeight: 700, fontSize: 18 }}>أكاديمية أشبال الإسلام</p>
      <p style={{ color: '#6f7974', fontSize: 12, marginTop: 4 }}>لتعليم القرآن الكريم وعلومه</p>
    </div>
  )
}
