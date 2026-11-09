'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logTeacherAbsence } from './actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Teacher = { id: string; name: string }
type Absence = {
  id: string
  created_at: string | null
  details: {
    teacher_name?: string
    absence_date?: string
    reason?: string | null
  } | null
}

export default function TeacherAbsencesPage() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [absences, setAbsences] = useState<Absence[]>([])
  const [loadErr, setLoadErr] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [teacherId, setTeacherId] = useState('')
  const [absenceDate, setAbsenceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')

  async function load() {
    const sb = createClient()
    const [{ data: t, error: tErr }, { data: a, error: aErr }] = await Promise.all([
      sb.from('teachers').select('id, name').eq('is_active', true).order('name'),
      sb
        .from('activity_log')
        .select('id, details, created_at')
        .eq('action', 'teacher_absence')
        .order('created_at', { ascending: false })
        .limit(100),
    ])
    if (tErr) setLoadErr(tErr.message)
    if (aErr) setLoadErr((prev) => prev || aErr.message)
    setTeachers((t as Teacher[]) || [])
    setAbsences((a as Absence[]) || [])
  }

  useEffect(() => {
    load()
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const fd = new FormData()
    fd.set('teacher_id', teacherId)
    fd.set('absence_date', absenceDate)
    fd.set('reason', reason)
    startTransition(async () => {
      const r = await logTeacherAbsence(fd)
      if (r?.error) {
        setMsg({ type: 'err', text: r.error })
        return
      }
      setMsg({ type: 'ok', text: (r as any)?.message || 'تم التسجيل' })
      setReason('')
      await load()
      router.refresh()
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
            غيابات المعلمين
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            تسجيل وعرض الغيابات
          </p>
        </div>
      </header>

      <section className="px-4 mb-4">
        <div className="card p-4">
          <h2 className="text-[14px] font-bold mb-3" style={{ color: '#00513c' }}>
            تسجيل غياب
          </h2>
          <form onSubmit={onSubmit} className="space-y-2">
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
            >
              <option value="" disabled>
                اختر المعلم
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              required
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="السبب (اختياري)"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <button
              type="submit"
              disabled={pending || !teacherId}
              className="w-full py-3 rounded-2xl text-white text-[14px] font-bold disabled:opacity-60"
              style={{ background: '#b45309' }}
            >
              {pending ? 'جاري التسجيل...' : 'تسجيل'}
            </button>
          </form>
          {msg && (
            <p
              className="mt-3 text-[13px] font-bold text-center"
              style={{ color: msg.type === 'ok' ? '#176b52' : '#ba1a1a' }}
            >
              {msg.text}
            </p>
          )}
          {loadErr && (
            <p className="mt-2 text-[12px] text-center" style={{ color: '#ba1a1a' }}>
              {loadErr}
            </p>
          )}
        </div>
      </section>

      <div className="px-4 space-y-2">
        {absences.map((a) => {
          const d = (a.details || {}) as any
          return (
            <div key={a.id} className="card p-3 flex justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold">{d.teacher_name || 'معلم'}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {d.absence_date || '—'} · {d.reason || 'بدون سبب'}
                </p>
              </div>
              <p className="text-[10px]" style={{ color: '#6f7974' }}>
                {a.created_at ? new Date(a.created_at).toLocaleDateString('ar-EG') : ''}
              </p>
            </div>
          )
        })}
        {absences.length === 0 && !loadErr && (
          <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
            لا غيابات مسجّلة
          </p>
        )}
      </div>
    </div>
  )
}
