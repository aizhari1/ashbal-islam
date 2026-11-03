'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type DashRole,
  type FeatureItem,
  featureIdFromHref,
  loadFeaturePrefs,
  saveFeaturePrefs,
} from '@/lib/feature-prefs'

type Props = {
  role: DashRole
  items: Array<Omit<FeatureItem, 'id'> & { id?: string }>
  backHref: string
  title?: string
}

export default function FeaturesPicker({ role, items, backHref, title }: Props) {
  const catalog = useMemo(
    () =>
      items.map((i) => ({
        ...i,
        id: i.id || featureIdFromHref(i.href),
      })),
    [items]
  )

  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loaded = loadFeaturePrefs(role)
    // املأ كل العناصر: غير موجود = true
    const next: Record<string, boolean> = {}
    catalog.forEach((i) => {
      next[i.id] = loaded[i.id] === undefined ? true : loaded[i.id] !== false
    })
    setPrefs(next)
  }, [role, catalog])

  function toggle(id: string) {
    setPrefs((p) => ({ ...p, [id]: !p[id] }))
    setSaved(false)
  }

  function selectAll(val: boolean) {
    const next: Record<string, boolean> = {}
    catalog.forEach((i) => {
      next[i.id] = val
    })
    setPrefs(next)
    setSaved(false)
  }

  function save() {
    saveFeaturePrefs(role, prefs)
    try {
      window.dispatchEvent(new Event('ashbal-features-changed'))
    } catch {
      /* ignore */
    }
    setSaved(true)
  }

  const onCount = Object.values(prefs).filter(Boolean).length

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3 sticky top-0 z-10" style={{ background: '#eefdf6' }}>
        <Link href={backHref} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            {title || 'المميزات الظاهرة'}
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {onCount} من {catalog.length} ظاهرة
          </p>
        </div>
      </header>

      <div className="px-4 flex gap-2 mb-3">
        <button type="button" onClick={() => selectAll(true)} className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-white shadow-sm" style={{ color: '#176b52' }}>
          تفعيل الكل
        </button>
        <button type="button" onClick={() => selectAll(false)} className="flex-1 rounded-xl py-2 text-[12px] font-bold bg-white shadow-sm" style={{ color: '#ba1a1a' }}>
          إخفاء الكل
        </button>
      </div>

      <main className="px-4 space-y-2">
        {catalog.map((i) => {
          const on = prefs[i.id] !== false
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => toggle(i.id)}
              className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm text-right"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ color: on ? '#176b52' : '#bec9c2' }}>
                {i.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-[14px]" style={{ color: '#1a1c1b' }}>
                  {i.title}
                </span>
                {i.desc && (
                  <span className="block text-[11px]" style={{ color: '#6f7974' }}>
                    {i.desc}
                  </span>
                )}
              </span>
              <span
                className="w-11 h-6 rounded-full relative flex-shrink-0 transition"
                style={{ background: on ? '#176b52' : '#cde8dc' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition"
                  style={{ right: on ? 2 : 22 }}
                />
              </span>
            </button>
          )
        })}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 max-w-lg mx-auto" style={{ background: 'linear-gradient(transparent, #eefdf6 30%)' }}>
        <button type="button" onClick={save} className="btn-primary w-full py-3.5 text-[15px]">
          {saved ? 'تم الحفظ ✓' : 'حفظ الاختيارات'}
        </button>
      </div>
    </div>
  )
}
