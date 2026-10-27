'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TeacherNotePage() {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function send() {
    if (!text.trim()) return
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('activity_log').insert({
        actor_id: user?.id, action: 'teacher_note', entity_type: 'note', details: { text },
      })
      if (error) setMsg(error.message)
      else { setMsg('تم إرسال الملاحظة للإدارة'); setText('') }
    })
  }

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto p-4">
      <Link href="/teacher" className="text-[#0d9b8a] text-[13px]">← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">ملاحظة للإدارة</h1>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
        className="w-full mt-4 bg-white border rounded-2xl p-3 text-[14px]" placeholder="اكتب طلبك أو ملاحظتك..." />
      {msg && <p className="text-[13px] mt-2 text-[#0d9b8a]">{msg}</p>}
      <button type="button" onClick={send} disabled={isPending}
        className="w-full mt-3 bg-[#0d9b8a] text-white py-3 rounded-2xl font-bold disabled:opacity-50">إرسال</button>
    </div>
  )
}
