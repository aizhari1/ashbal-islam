'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { adminDeleteSession } from '@/app/actions/admin-sessions'

export default function DeleteBtn({ id }: { id: string }) {
  const router = useRouter()
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()
  return (
    <span>
      <button type="button" disabled={pending} className="text-[11px] font-bold" style={{ color: '#93000a' }}
        onClick={() => { if (confirm('حذف الحصة؟ العدّاد هيرجع خطوة، وتقريرها هيتحفظ في سجل الأنشطة.')) start(async () => { const r: any = await adminDeleteSession(id); if (r?.error) setErr(r.error); else router.refresh() }) }}>
        {pending ? '...' : 'حذف'}
      </button>
      {err && <span className="text-[10px] block" style={{ color: '#93000a' }}>{err}</span>}
    </span>
  )
}
