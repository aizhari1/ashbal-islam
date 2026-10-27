'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addSupervisorEval } from '@/app/actions/schedule'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SupervisorEvalPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [points, setPoints] = useState(10)
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const sb = createClient()
    sb.from('teachers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setTeachers(data ?? []))
    sb.from('activity_log').select('*').eq('action', 'supervisor_eval').order('created_at', { ascending: false }).limit(40)
      .then(({ data }) => setHistory(data ?? []))
  }, [])

  const pointsByTeacher: Record<string, number> = {}
  for (const h of history) {
    const d = h.details || {}
    const name = d.teacher_name || h.entity_id
    pointsByTeacher[name] = (pointsByTeacher[name] || 0) + Number(d.points || 0)
  }

  function submit() {
    if (!teacherId) { setMsg('اختر معلماً'); return }
    const t = teachers.find((x) => x.id === teacherId)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('teacher_id', teacherId)
      fd.set('teacher_name', t?.name || '')
      fd.set('points', String(points))
      fd.set('notes', notes)
      const r = await addSupervisorEval(fd)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم تسجيل نقاط الإشراف')
        setNotes('')
        router.refresh()
        const sb = createClient()
        const { data } = await sb.from('activity_log').select('*').eq('action', 'supervisor_eval').order('created_at', { ascending: false }).limit(40)
        setHistory(data ?? [])
      }
    })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-24" style={{ background: '#eefdf6' }}>
      <Link href="/admin" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">تقييم الإشراف</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>نقاط شهرية للمعلمين — أكتوبر 2026</p>

      <div className="card p-4 mt-4 space-y-3">
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input">
          <option value="">— اختر المعلم —</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div>
          <label className="text-[12px]">النقاط ({points})</label>
          <input type="range" min={0} max={20} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full" />
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} placeholder="ملاحظات" />
        {msg && <p className="text-[12px]" style={{ color: '#176b52' }}>{msg}</p>}
        <button type="button" onClick={submit} disabled={isPending} className="btn-primary w-full py-3">حفظ التقييم</button>
      </div>

      <h2 className="text-[14px] font-bold mt-5 mb-2">مجموع نقاط الشهر</h2>
      <div className="space-y-2 mb-4">
        {Object.entries(pointsByTeacher).sort((a, b) => b[1] - a[1]).map(([name, pts]) => (
          <div key={name} className="card p-3 flex justify-between text-[13px]">
            <span className="font-bold">{name}</span>
            <span style={{ color: '#176b52' }} className="font-bold">{pts} نقطة</span>
          </div>
        ))}
        {Object.keys(pointsByTeacher).length === 0 && (
          <p className="text-[12px] text-center" style={{ color: '#6f7974' }}>لا نقاط بعد</p>
        )}
      </div>

      <h2 className="text-[14px] font-bold mb-2">السجل</h2>
      <div className="space-y-2">
        {history.map((h) => {
          const d = h.details || {}
          return (
            <div key={h.id} className="card p-3 text-[13px]">
              <p className="font-bold">{d.teacher_name} · +{d.points}</p>
              {d.notes && <p style={{ color: '#6f7974' }}>{d.notes}</p>}
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{h.created_at?.slice(0, 10)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
