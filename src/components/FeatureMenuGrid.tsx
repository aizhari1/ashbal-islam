'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  type DashRole,
  type FeatureItem,
  featureIdFromHref,
  filterVisibleFeatures,
  loadFeaturePrefs,
} from '@/lib/feature-prefs'

type Props = {
  role: DashRole
  items: Array<Omit<FeatureItem, 'id'> & { id?: string }>
}

/** شبكة المميزات — روابط <a> عادية عشان التنقل ما يعلقش */
export default function FeatureMenuGrid({ role, items }: Props) {
  const normalized = useMemo(
    () =>
      items.map((i) => ({
        ...i,
        id: i.id || featureIdFromHref(i.href),
        color: i.color || '#176b52',
      })),
    [items]
  )

  const [visible, setVisible] = useState(normalized)

  useEffect(() => {
    setVisible(filterVisibleFeatures(role, normalized))
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ashbal_features_' + role) {
        setVisible(filterVisibleFeatures(role, normalized))
      }
    }
    const onCustom = () => setVisible(filterVisibleFeatures(role, normalized))
    window.addEventListener('storage', onStorage)
    window.addEventListener('ashbal-features-changed', onCustom)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('ashbal-features-changed', onCustom)
    }
  }, [role, normalized])

  if (visible.length === 0) {
    return (
      <div className="card p-4 text-center">
        <p className="text-[13px]" style={{ color: '#6f7974' }}>
          لا مميزات ظاهرة. افتح «المميزات الظاهرة» من المزيد لتفعيل ما تحتاجه.
        </p>
        <a
          href={`/${role === 'admin' ? 'admin' : role}/features`}
          className="text-[13px] font-bold mt-2 inline-block"
          style={{ color: '#176b52' }}
        >
          اختيار المميزات ←
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 relative z-10">
      {visible.map((m) => (
        <a
          key={m.id + m.href}
          href={m.href}
          className="card p-3.5 flex flex-col gap-1.5 active:scale-[0.98] transition"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ color: m.color }}>
            {m.icon}
          </span>
          <p className="text-[13px] font-bold" style={{ color: '#1a1c1b' }}>
            {m.title}
          </p>
          {m.desc && (
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              {m.desc}
            </p>
          )}
        </a>
      ))}
    </div>
  )
}

export function useFeatureVisibility(role: DashRole) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  useEffect(() => {
    setPrefs(loadFeaturePrefs(role))
  }, [role])
  return prefs
}
