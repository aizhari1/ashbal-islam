'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMySession } from '@/app/actions/attendance'

export default function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm('حذف الحصة؟ هيتحذف تقريرها معاها ويرجع رقم الحصة.')) return
          start(async () => {
            const r: any = await deleteMySession(id)
            if (r?.error) setErr(r.error)
            else router.refresh()
          })
        }}
        className="text-[11px] font-bold"
        style={{ color: '#93000a' }}
      >
        {pending ? '...' : 'حذف'}
      </button>
      {err && <span className="text-[11px] mr-1" style={{ color: '#93000a' }}>{err}</span>}
    </span>
  )
}
