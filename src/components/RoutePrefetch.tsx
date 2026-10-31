'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** يحمّل مسبقاً صفحات لوحة التحكم عشان التنقل يبقى فوري */
export default function RoutePrefetch({ routes }: { routes: string[] }) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      routes.forEach((href) => {
        try {
          router.prefetch(href)
        } catch {
          /* ignore */
        }
      })
    }, 400)
    return () => clearTimeout(t)
  }, [router, routes])

  return null
}
