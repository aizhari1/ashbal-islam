'use client'

import { useEffect, useState } from 'react'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * بانر تثبيت تطبيق أشبال الإسلام (PWA)
 * يظهر أول ما يفتح الموقع على الموبايل لو التطبيق مش متثبت
 */
export function InstallAshbal() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // تسجيل Service Worker عشان التثبيت يشتغل
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS
      window.navigator.standalone === true

    if (isStandalone) {
      setInstalled(true)
      return
    }

    const dismissed = localStorage.getItem('ashbal_install_dismissed')
    if (dismissed === '1') return

    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBIP)

    // لو المتصفح مش بيدعم beforeinstallprompt (مثل iOS) نعرض تعليمات بسيطة
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isAndroid = /android/i.test(navigator.userAgent)
    if (isIOS || isAndroid) {
      // أظهر البانر بعد ثانيتين حتى لو مفيش BIP (لـ iOS)
      const t = setTimeout(() => {
        if (!isStandalone) setVisible(true)
      }, 1200)
      return () => {
        window.removeEventListener('beforeinstallprompt', onBIP)
        clearTimeout(t)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBIP)
  }, [])

  if (installed || !visible) return null

  async function install() {
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setVisible(false)
      }
      setDeferred(null)
      return
    }
    // iOS: تعليمات
    alert('للتثبيت على آيفون:\n1) اضغط مشاركة ⎙\n2) إضافة إلى الشاشة الرئيسية\n3) إضافة')
  }

  function dismiss() {
    setVisible(false)
    try {
      localStorage.setItem('ashbal_install_dismissed', '1')
    } catch {
      /* ignore */
    }
  }

  return (
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
          <p className="text-[11px] opacity-90 leading-snug mt-0.5">ثبّت التطبيق للوصول السريع بدون متصفح</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="flex-shrink-0 rounded-xl px-3 py-2 text-[13px] font-bold"
          style={{ background: '#e0c27a', color: '#00513c' }}
        >
          تثبيت
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 text-[18px] opacity-70 px-1"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  )
}
