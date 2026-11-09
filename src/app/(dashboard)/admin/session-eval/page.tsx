'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveSessionTeacherEval } from './actions'
import Link from 'next/link'
import { todayKey } from '@/lib/dues'

type Teacher = { id: string; name: string }
type Student = { id: string; name: string; code: string | null; teacher_id: string | null }
type Att = {
  id: string
  session_date: string
  status: string
  session_num: number | null
  teacher_id: string | null
  student_id: string
  students?: { name: string; code: string | null } | null
  teachers?: { name: string } | null
}
type EvalRow = { id: string; created_at: string; details: any }

export default function SessionEvalPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [recentAtt, setRecentAtt] = useState<Att[]>([])
  const [history, setHistory] = useState<EvalRow[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [sessionDate, setSessionDate] = useState(todayKey())
  const [attendanceId, setAttendanceId] = useState('')
  const [camera, setCamera] = useState<'مفتوحة' | 'مغلقة' | 'جزئي'>('مفتوحة')
  const [performance, setPerformance] = useState(4)
  const [quality, setQuality] = useState(4)
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')

  async function load() {
    const sb = createClient()
    const [{ data: t }, { data: s }, { data: a }, { data: h }] = await Promise.all([
      sb.from('teachers').select('id, name').eq('is_active', true).order('name'),
      sb.from('students').select('id, name, code, teacher_id').eq('status', 'نشط').order('name').limit(800),
      sb
        .from('attendance')
        .select('id, session_date, status, session_num, teacher_id, student_id, students(name, code), teachers(name)')
        .order('session_date', { ascending: false })
        .limit(60),
      sb
        .from('activity_log')
        .select('id, created_at, details')
        .eq('action', 'session_teacher_eval')
        .order('created_at', { ascending: false })
        .limit(40),
    ])
    setTeachers((t as any) || [])
    setStudents((s as any) || [])
    setRecentAtt((a as any) || [])
    setHistory((h as any) || [])
  }

  useEffect(() => {
    load()
  }, [])

  const filteredStudents = useMemo(() => {
    let list = students
    if (teacherId) list = list.filter((s) => s.teacher_id === teacherId)
    const qq = q.trim().toLowerCase()
    if (qq) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(qq) || String(s.code || '').toLowerCase().includes(qq)
      )
    }
    return list.slice(0, 80)
  }, [students, teacherId, q])

  function pickAttendance(a: Att) {
    setAttendanceId(a.id)
    setSessionDate(a.session_date)
    if (a.teacher_id) setTeacherId(a.teacher_id)
    setStudentId(a.student_id)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const fd = new FormData()
    fd.set('teacher_id', teacherId)
    fd.set('student_id', studentId)
    fd.set('session_date', sessionDate)
    fd.set('attendance_id', attendanceId)
    fd.set('camera', camera)
    fd.set('performance', String(performance))
    fd.set('quality', String(quality))
    fd.set('notes', notes)
    start(async () => {
      const r = await saveSessionTeacherEval(fd)
      if (r?.error) {
        setMsg({ type: 'err', text: r.error })
        return
      }
      setMsg({ type: 'ok', text: (r as any)?.message || 'تم الحفظ' })
      setNotes('')
      setAttendanceId('')
      await load()
    })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تقييم حصة المعلم
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            كاميرا · أداء · جودة — للإدارة والإشراف
          </p>
        </div>
      </header>

      <main className="px-4 space-y-4">
        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-2">حصص حديثة (اضغط للاختيار)</h2>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentAtt.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => pickAttendance(a)}
                className="w-full text-right rounded-xl px-3 py-2 text-[12px]"
                style={{
                  background: attendanceId === a.id ? '#e8f7f0' : '#fff',
                  border: `1px solid ${attendanceId === a.id ? '#176b52' : '#cde8dc'}`,
                }}
              >
                <span className="font-bold">{a.students?.name || '—'}</span>
                <span style={{ color: '#6f7974' }}>
                  {' '}
                  · {a.session_date}
                  {a.session_num ? ` · حصة ${a.session_num}` : ''} · {a.teachers?.name || '—'} · {a.status}
                </span>
              </button>
            ))}
            {recentAtt.length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>
                مفيش حصص حديثة
              </p>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="card p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold block mb-1">المعلم</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input" required>
              <option value="">— اختر —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">الطالب (اختياري)</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input mb-1" placeholder="بحث اسم/كود" />
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input">
              <option value="">— بدون تحديد —</option>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">تاريخ الحصة</label>
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="input" required />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">الكاميرا</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['مفتوحة', 'جزئي', 'مغلقة'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCamera(c)}
                  className="py-2 rounded-xl text-[12px] font-bold"
                  style={{
                    background:
                      camera === c ? (c === 'مغلقة' ? '#ba1a1a' : c === 'جزئي' ? '#d49a35' : '#176b52') : '#fff',
                    color: camera === c ? '#fff' : '#3f4944',
                    border: '1px solid #cde8dc',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">الأداء ({performance}/5)</label>
            <input
              type="range"
              min={1}
              max={5}
              value={performance}
              onChange={(e) => setPerformance(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold block mb-1">الجودة ({quality}/5)</label>
            <input
              type="range"
              min={1}
              max={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
            placeholder="ملاحظات على الحصة"
          />

          {msg && (
            <p className="text-[13px] font-bold text-center" style={{ color: msg.type === 'ok' ? '#176b52' : '#ba1a1a' }}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={pending || !teacherId} className="btn-primary w-full py-3">
            {pending ? 'جاري الحفظ...' : 'حفظ تقييم الحصة'}
          </button>
        </form>

        <section>
          <h2 className="text-[14px] font-bold mb-2">آخر التقييمات</h2>
          <div className="space-y-2">
            {history.map((h) => {
              const d = h.details || {}
              return (
                <div key={h.id} className="card p-3 text-[12px]">
                  <p className="font-bold text-[13px]">
                    {d.teacher_name || 'معلم'}
                    {d.student_name ? ` · ${d.student_name}` : ''}
                  </p>
                  <p style={{ color: '#6f7974' }}>
                    {d.session_date} · كاميرا: {d.camera} · أداء {d.performance}/5 · جودة {d.quality}/5
                  </p>
                  {d.notes && <p className="mt-0.5">{d.notes}</p>}
                  <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
                    {d.evaluator_role === 'supervisor' ? 'إشراف' : 'إدارة'}
                    {d.evaluator_name ? ` · ${d.evaluator_name}` : ''} ·{' '}
                    {h.created_at?.slice(0, 16)?.replace('T', ' ')}
                  </p>
                </div>
              )
            })}
            {history.length === 0 && (
              <p className="text-center text-[13px] py-4" style={{ color: '#6f7974' }}>
                لا تقييمات بعد
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
