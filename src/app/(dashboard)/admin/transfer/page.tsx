'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TransferPage() {
  const [students, setStudents] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [studentId, setStudentId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const sb = createClient()
    sb.from('students').select('id, name, code, teacher_id').eq('status', 'نشط').order('name').limit(200)
      .then(({ data }) => setStudents(data ?? []))
    sb.from('teachers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setTeachers(data ?? []))
  }, [])

  function submit() {
    if (!studentId || !teacherId) { setMsg('اختر الطالب والمعلم'); return }
    startTransition(async () => {
      const sb = createClient()
      const { error } = await sb.from('students').update({ teacher_id: teacherId }).eq('id', studentId)
      if (error) setMsg(error.message)
      else setMsg('تم نقل الطالب بنجاح')
    })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/supervisor" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">نقل طالب / تغيير معلم</h1>
      <div className="card p-4 mt-4 space-y-3">
        <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          <option value="">— الطالب —</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
        </select>
        <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— المعلم الجديد —</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {msg && <p className="text-[13px]" style={{ color: '#176b52' }}>{msg}</p>}
        <button type="button" onClick={submit} disabled={isPending} className="btn-primary w-full py-3">نقل</button>
      </div>
    </div>
  )
}
