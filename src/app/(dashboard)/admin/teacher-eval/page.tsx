'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminTeacherEvalPage() {
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [notes, setNotes] = useState('')
  const [criteria, setCriteria] = useState({ commitment: 5, quality: 5, communication: 5 })
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()
  const [history, setHistory] = useState<{ id: string; details: unknown; created_at: string }[]>([])

  useEffect(() => {
    const sb = createClient()
    sb.from('teachers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setTeachers(data ?? []))
    sb.from('activity_log').select('*').eq('action', 'admin_teacher_eval').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setHistory(data ?? []))
  }, [])

  function submit() {
    if (!teacherId) { setMsg('اختر معلماً'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const t = teachers.find((x) => x.id === teacherId)
      const avg = (criteria.commitment + criteria.quality + criteria.communication) / 3
      const { error } = await supabase.from('activity_log').insert({
        actor_id: user?.id,
        action: 'admin_teacher_eval',
        entity_type: 'teacher',
        entity_id: teacherId,
        details: { teacher_name: t?.name, score: avg, criteria, notes, month: 'أكتوبر 2026' },
      })
      if (error) setMsg(error.message)
      else {
        setMsg('تم حفظ تقييم الإدارة')
        setNotes('')
        const { data } = await supabase.from('activity_log').select('*').eq('action', 'admin_teacher_eval').order('created_at', { ascending: false }).limit(20)
        setHistory(data ?? [])
      }
    })
  }

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto p-4 pb-24">
      <Link href="/admin" className="text-[#0d9b8a] text-[13px]">← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">تقييم المعلمين (إدارة)</h1>
      <p className="text-[12px] text-[#6f7974] mb-4">تقييم الإدارة لكل معلم</p>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2.5 text-[14px]">
          <option value="">— اختر المعلم —</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(['commitment', 'quality', 'communication'] as const).map((k) => (
          <div key={k}>
            <label className="text-[12px] font-medium">
              {k === 'commitment' ? 'الالتزام' : k === 'quality' ? 'جودة التسميع' : 'التواصل مع الأولياء'} ({criteria[k]}/5)
            </label>
            <input type="range" min={1} max={5} value={criteria[k]}
              onChange={(e) => setCriteria((c) => ({ ...c, [k]: Number(e.target.value) }))}
              className="w-full" />
          </div>
        ))}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="ملاحظات" className="w-full border rounded-xl px-3 py-2 text-[14px]" />
        {msg && <p className="text-[12px] text-[#0d9b8a]">{msg}</p>}
        <button type="button" onClick={submit} disabled={isPending}
          className="w-full bg-[#0f5c4c] text-white py-3 rounded-xl font-bold">حفظ التقييم</button>
      </div>

      <h2 className="text-[14px] font-bold mt-5 mb-2">آخر التقييمات</h2>
      <div className="space-y-2">
        {history.map((h) => {
          const d = h.details as { teacher_name?: string; score?: number; notes?: string }
          return (
            <div key={h.id} className="bg-white rounded-xl p-3 text-[13px] shadow-sm">
              <p className="font-bold">{d?.teacher_name}</p>
              <p className="text-[#0d9b8a]">الدرجة: {Number(d?.score || 0).toFixed(1)}/5</p>
              {d?.notes && <p className="text-[#6f7974] text-[12px]">{d.notes}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
