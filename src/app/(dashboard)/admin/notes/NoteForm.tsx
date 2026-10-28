'use client'

import { useTransition, useState } from 'react'
import { addNote } from '@/app/actions/notes'
import { useRouter } from 'next/navigation'

export function NoteForm() {
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const fd = new FormData()
      fd.set('body', body)
      fd.set('target', 'admin')
      const r = await addNote(fd)
      if ((r as any).error) setMsg((r as any).error)
      else {
        setBody('')
        setMsg('تم الحفظ')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="card p-3.5 space-y-2">
      <label className="text-[12px] font-semibold" style={{ color: '#3f4944' }}>ملاحظة جديدة</label>
      <textarea
        className="input min-h-[90px] text-[14px]"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="اكتب ملاحظة..."
        required
      />
      <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 text-[14px]">
        {pending ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
      </button>
      {msg && <p className="text-[12px]" style={{ color: '#176b52' }}>{msg}</p>}
    </form>
  )
}
