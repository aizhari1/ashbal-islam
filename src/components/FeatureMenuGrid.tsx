'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

/** شبكة المميزات — تحترم اختيار الظهور + prefetch عند المرور */
export default function FeatureMenuGrid({ role, items }: Props) {
  const router = useRouter()
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
    // استمع لتغيير التفضيلات من تاب المميزات
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ashbal_features_' + role) {
        setVisible(filterVisibleFeatures(role, normalized))
      }
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('ashbal-features-changed', () => {
      setVisible(filterVisibleFeatures(role, normalized))
    })
    return () => {
      window.removeEventListener('storage', onStorage)
    }
  }, [role, normalized])

  // تحميل مسبق لكل الروابط الظاهرة
  useEffect(() => {
    const t = setTimeout(() => {
      visible.forEach((m) => {
        try {
          router.prefetch(m.href.split('?')[0])
        } catch {
          /* ignore */
        }
      })
    }, 200)
    return () => clearTimeout(t)
  }, [visible, router])

  if (visible.length === 0) {
    return (
      <div className="card p-4 text-center">
        <p className="text-[13px]" style={{ color: '#6f7974' }}>
          لا مميزات ظاهرة. افتح «المميزات الظاهرة» من المزيد لتفعيل ما تحتاجه.
        </p>
        <Link href={`/${role === 'admin' ? 'admin' : role}/features`} className="text-[13px] font-bold mt-2 inline-block" style={{ color: '#176b52' }}>
          اختيار المميزات ←
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {visible.map((m) => (
        <Link
          key={m.id + m.href}
          href={m.href}
          prefetch
          onMouseEnter={() => router.prefetch(m.href.split('?')[0])}
          onTouchStart={() => router.prefetch(m.href.split('?')[0])}
          className="card p-3.5 flex flex-col gap-1.5 active:scale-[0.98] transition"
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
        </Link>
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
