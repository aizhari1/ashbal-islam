'use client'

import { useEffect, useState } from 'react'

const THEME_KEY = 'ashbal_theme'

function applyTheme(mode: 'light' | 'dark') {
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* ignore */
  }
}

/** زر الوضع الليلي / النهاري — ثابت أعلى اليسار */
export function ThemeToggle() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let initial: 'light' | 'dark' = 'light'
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (saved === 'dark' || saved === 'light') initial = saved
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) initial = 'dark'
    } catch {
      /* ignore */
    }
    applyTheme(initial)
    setMode(initial)
    setReady(true)
  }, [])

  function toggle() {
    const next = mode === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setMode(next)
  }

  if (!ready) return null

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      title={mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
      className="theme-toggle-btn"
    >
      <span className="material-symbols-outlined text-[22px]">
        {mode === 'dark' ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}

/** سكربت مبكر يمنع وميض الثيم قبل React */
export const THEME_INIT_SCRIPT = `
(function(){try{var t=localStorage.getItem('ashbal_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}else{document.documentElement.style.colorScheme='light'}}catch(e){}})();
`
