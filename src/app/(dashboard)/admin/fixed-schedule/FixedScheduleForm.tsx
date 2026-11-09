'use client'

import { useMemo, useState, useTransition } from 'react'
import { addBulkFixedSchedule } from '@/app/actions/schedule'
import { useRouter } from 'next/navigation'

const DAYS = [
  { v: 0, l: 'الأحد' },
  { v: 1, l: 'الإثنين' },
  { v: 2, l: 'الثلاثاء' },
  { v: 3, l: 'الأربعاء' },
  { v: 4, l: 'الخميس' },
  { v: 5, l: 'الجمعة' },
  { v: 6, l: 'السبت' },
]

export function FixedScheduleForm({
  students,
  teachers,
  defaultStudentId = '',
}: {
  students: { id: string; name: string; code?: string | null }[]
  teachers: { id: string; name: string }[]
  defaultStudentId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [studentQ, setStudentQ] = useState('')
  const [studentId, setStudentId] = useState(defaultStudentId)
  const [days, setDays] = useState<number[]>([1])

  const filteredStudents = useMemo(() => {
    const q = studentQ.trim().toLowerCase()
    if (!q) return students.slice(0, 80)
    return students
      .filter(
        (s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.code || '').toLowerCase().includes(q)
      )
      .slice(0, 80)
  }, [students, studentQ])

  function toggleDay(v: number) {
    setDays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort()))
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg('')
    if (!studentId) {
      setMsg('اختَر الطالب')
      return
    }
    if (days.length === 0) {
      setMsg('اختَر يوم واحد على الأقل')
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set('student_id', studentId)
    fd.delete('day_of_week')
    for (const d of days) fd.append('day_of_week', String(d))
    startTransition(async () => {
      const r = await addBulkFixedSchedule(fd)
      if (r?.error) setMsg(r.error)
      else {
        setMsg((r as any)?.message || 'تم إضافة المواعيد')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div>
        <label className="text-[11px] font-bold block mb-1" style={{ color: '#3f4944' }}>
          بحث عن طالب
        </label>
        <input
          value={studentQ}
          onChange={(e) => setStudentQ(e.target.value)}
          className="input"
          placeholder="اسم أو كود..."
        />
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="input mt-1"
          required
        >
          <option value="">— الطالب —</option>
          {filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
        {studentQ && filteredStudents.length === 0 && (
          <p className="text-[11px] mt-1" style={{ color: '#ba1a1a' }}>
            مفيش نتائج
          </p>
        )}
      </div>

      <select name="teacher_id" className="input" required defaultValue="">
        <option value="" disabled>
          — المعلم —
        </option>
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <div>
        <label className="text-[11px] font-bold block mb-1" style={{ color: '#3f4944' }}>
          الأيام (تقدر تختار أكتر من يوم)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const on = days.includes(d.v)
            return (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDay(d.v)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                style={{
                  background: on ? '#176b52' : '#fff',
                  color: on ? '#fff' : '#3f4944',
                  border: `1px solid ${on ? '#176b52' : '#cde8dc'}`,
                }}
              >
                {d.l}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input name="start_time" type="time" className="input" required />
        <input name="duration_minutes" type="number" defaultValue={30} className="input" placeholder="المدة" />
      </div>
      <input name="zoom_link" className="input" placeholder="رابط Zoom / Meet" dir="ltr" />
      <input name="notes" className="input" placeholder="ملاحظات" />
      {msg && (
        <p
          className="text-[12px] font-bold"
          style={{ color: msg.includes('فشل') || msg.includes('اختَر') ? '#ba1a1a' : '#176b52' }}
        >
          {msg}
        </p>
      )}
      <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
        {isPending ? 'جاري الحفظ...' : `حفظ ${days.length || 0} موعد دفعة واحدة`}
      </button>
    </form>
  )
}
