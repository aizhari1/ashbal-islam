'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCourse } from '@/app/actions/courses'

export default function NewCourseButton() {
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary w-full py-3 text-[14px]">
      <span className="material-symbols-outlined text-[18px] ml-1">add</span> كورس جديد
    </button>
  )
  return (
    <form className="card p-4 space-y-3" action={(fd) => start(async () => {
      const r: any = await saveCourse(fd)
      if (r?.error) return setErr(r.error)
      router.push(`/admin/courses/${r.id}`)
    })}>
      <input name="title" className="input" placeholder="اسم الكورس" autoFocus required />
      <textarea name="short_desc" className="input" rows={2} placeholder="وصف مختصر (يظهر في الكارت)" />
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1 py-2.5">{pending ? '...' : 'إنشاء وفتح'}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-lg bg-white border border-[#e5efe8] text-[13px]">إلغاء</button>
      </div>
      {err && <p className="text-[12px]" style={{ color: '#93000a' }}>{err}</p>}
    </form>
  )
}
