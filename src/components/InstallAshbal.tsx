'use client'

import { useEffect, useState } from 'react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * تثبيت أشبال الإسلام:
 * - بانر أول مرة
 * - زر عائم دائم لو مش متثبت
 */
export function InstallAshbal() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [banner, setBanner] = useState(false)
  const [fab, setFab] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari
      window.navigator.standalone === true

    if (isStandalone) {
      setInstalled(true)
      return
    }

    const dismissed = localStorage.getItem('ashbal_install_dismissed') === '1'

    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      setFab(true)
      if (!dismissed) setBanner(true)
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    // أظهر الزر العائم على الموبايل حتى بدون BIP (تعليمات يدوية)
    const mobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
    if (mobile) {
      setFab(true)
      if (!dismissed) {
        const t = setTimeout(() => setBanner(true), 800)
        return () => {
          window.removeEventListener('beforeinstallprompt', onBIP)
          clearTimeout(t)
        }
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [])

  async function install() {
    if (deferred) {
      try {
        await deferred.prompt()
        const choice = await deferred.userChoice
        if (choice.outcome === 'accepted') {
          setInstalled(true)
          setBanner(false)
          setFab(false)
        }
      } catch {
        /* ignore */
      }
      setDeferred(null)
      return
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIOS) {
      alert('للتثبيت على آيفون:\n1) زر المشاركة ⎙\n2) «إضافة إلى الشاشة الرئيسية»\n3) إضافة')
      return
    }
    alert(
      'للتثبيت:\nمن قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'
    )
  }

  function dismissBanner() {
    setBanner(false)
    try {
      localStorage.setItem('ashbal_install_dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  if (installed) return null

  return (
    <>
      {banner && (
        <div
          className="fixed bottom-0 inset-x-0 z-[9999] p-3"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div
            className="mx-auto max-w-md rounded-2xl shadow-2xl flex items-center gap-3 p-3"
            style={{ background: '#00513c', color: '#fff' }}
          >
            <img
              src="/icons/icon-192.png"
              alt="أشبال الإسلام"
              width={48}
              height={48}
              className="rounded-xl bg-white object-contain flex-shrink-0"
              style={{ width: 48, height: 48 }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] leading-tight">تثبيت أشبال الإسلام</p>
              <p className="text-[11px] opacity-90 leading-snug mt-0.5">وصول سريع بدون متصفح</p>
            </div>
            <button
              type="button"
              onClick={install}
              className="flex-shrink-0 rounded-xl px-3 py-2 text-[13px] font-bold"
              style={{ background: '#e0c27a', color: '#00513c' }}
            >
              تثبيت
            </button>
            <button type="button" onClick={dismissBanner} className="flex-shrink-0 text-[18px] opacity-70 px-1" aria-label="إغلاق">
              ×
            </button>
          </div>
        </div>
      )}

      {fab && !banner && (
        <button type="button" onClick={install} className="install-fab" aria-label="تثبيت التطبيق">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            install_mobile
          </span>
          <span className="text-[11px] font-bold">تثبيت</span>
        </button>
      )}
    </>
  )
}
