'use client'

import { useRouter } from 'next/navigation'

/** اختيار شهر العرض — يغيّر عرض المحصّل فقط، ولا يمس المستحقات ولا تواريخها */
export function MonthSwitcher({ current, basePath }: { current: string; basePath: string }) {
  const router = useRouter()
  return (
    <input
      type="month"
      value={current}
      onChange={(e) => {
        if (e.target.value) router.push(`${basePath}?month=${e.target.value}`)
      }}
      className="rounded-lg border px-2 py-1 text-[12px] bg-white"
      style={{ borderColor: '#cde8dc' }}
      dir="ltr"
      aria-label="شهر العرض"
    />
  )
}
