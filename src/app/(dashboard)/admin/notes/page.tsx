'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NotesPage() {
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [list, setList] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()

  function load() {
    const sb = createClient()
    sb.from('activity_log').select('*').eq('action', 'note_to_admin').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setList(data ?? []))
  }
  useEffect(() => { load() }, [])

  function send() {
    if (!note.trim()) return
    startTransition(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      const { data: profile } = await sb.from('profiles').select('full_name').eq('id', user!.id).single()
      await sb.from('activity_log').insert({
        actor_id: user?.id,
        action: 'note_to_admin',
        entity_type: 'note',
        details: { text: note, from: profile?.full_name || 'مشرف' },
      })
      setNote('')
      setMsg('تم إرسال الملاحظة')
      load()
    })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/supervisor" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">ملاحظة أو مشكلة للإدارة</h1>
      <textarea className="input mt-4" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="اكتب الملاحظة..." />
      {msg && <p className="text-[12px] mt-2" style={{ color: '#176b52' }}>{msg}</p>}
      <button type="button" onClick={send} disabled={isPending} className="btn-primary w-full py-3 mt-3">إرسال</button>
      <h2 className="text-[14px] font-bold mt-6 mb-2">آخر الملاحظات</h2>
      <div className="space-y-2">
        {list.map((n) => (
          <div key={n.id} className="card p-3 text-[13px]">
            <p className="font-bold">{(n.details as any)?.from}</p>
            <p>{(n.details as any)?.text}</p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>{n.created_at?.slice(0, 16)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
