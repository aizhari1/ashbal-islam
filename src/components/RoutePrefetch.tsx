'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** يحمّل مسبقاً صفحات لوحة التحكم عشان التنقل يبقى فوري */
export default function RoutePrefetch({ routes }: { routes: string[] }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (cancelled) return
      routes.forEach((href) => {
        try {
          router.prefetch(href)
        } catch {
          /* ignore */
        }
      })
    }
    // فوري + بعد تفاعل أول (idle)
    run()
    const t1 = setTimeout(run, 300)
    const t2 = setTimeout(run, 1500)
    const onVis = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [router, routes])

  return null
}
