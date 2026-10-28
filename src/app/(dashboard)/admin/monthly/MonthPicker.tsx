'use client'

import { useRouter } from 'next/navigation'

export function MonthPicker({ current }: { current: string }) {
  const router = useRouter()
  return (
    <input
      type="month"
      value={current}
      onChange={(e) => {
        if (e.target.value) router.push(`/admin/monthly?month=${e.target.value}`)
      }}
      className="input w-full text-center text-[15px] font-bold py-2.5"
      dir="ltr"
    />
  )
}
