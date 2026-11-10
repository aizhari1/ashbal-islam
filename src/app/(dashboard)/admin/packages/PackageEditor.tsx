'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archivePackage, savePackage } from './actions'

type Pkg = {
  id?: string
  name: string
  sessions_count: number
  duration_minutes: number | null
  price: number
  description: string | null
}

export default function PackageEditor({ pkg }: { pkg?: Pkg }) {
  const router = useRouter()
  const [open, setOpen] = useState(!pkg)
  const [name, setName] = useState(pkg?.name ?? '')
  const [sessions, setSessions] = useState(String(pkg?.sessions_count ?? ''))
  const [duration, setDuration] = useState(String(pkg?.duration_minutes ?? ''))
  const [price, setPrice] = useState(String(pkg?.price ?? ''))
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  function save() {
    start(async () => {
      const res: any = await savePackage({
        id: pkg?.id,
        name,
        sessions_count: Number(sessions),
        duration_minutes: duration ? Number(duration) : null,
        price: Number(price),
        description: pkg?.description ?? null,
      })
      if (res?.error) return setMsg('خطأ: ' + res.error)
      setMsg('✓ اتحفظ')
      if (!pkg) {
        setName('')
        setSessions('')
        setDuration('')
        setPrice('')
      } else setOpen(false)
      router.refresh()
    })
  }

  function remove() {
    if (!pkg?.id || !confirm('تأكيد إخفاء الباقة؟ الطلاب الحاليين مش هيتأثروا.')) return
    start(async () => {
      const res: any = await archivePackage(pkg.id!)
      if (res?.error) return setMsg('خطأ: ' + res.error)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-[12px] font-bold" style={{ color: '#176b52' }}>
        ✎ تعديل
      </button>
    )
  }
  return (
    <div className="mt-3 space-y-2">
      <input className="input" placeholder="اسم الباقة" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <input className="input" type="number" min={1} placeholder="عدد الحصص" value={sessions} onChange={(e) => setSessions(e.target.value)} />
        <input className="input" type="number" min={5} placeholder="المدة (د)" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <input className="input" type="number" min={0} placeholder="السعر" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="flex gap-2 items-center">
        <button onClick={save} disabled={pending} className="btn-primary px-4 py-2 text-[12px]">
          {pending ? '...' : pkg ? 'حفظ' : 'إضافة باقة'}
        </button>
        {pkg && (
          <>
            <button onClick={() => setOpen(false)} className="text-[12px]">إلغاء</button>
            <button onClick={remove} disabled={pending} className="text-[12px] mr-auto" style={{ color: '#93000a' }}>إخفاء</button>
          </>
        )}
      </div>
      {msg && <p className="text-[12px] font-bold">{msg}</p>}
      {pkg && <p className="text-[11px]" style={{ color: '#6f7974' }}>تغيير السعر بيأثر على الطلاب الجدد فقط.</p>}
    </div>
  )
}
