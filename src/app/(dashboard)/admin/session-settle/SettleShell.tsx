'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addTeacherSession, deleteAttendanceRow } from './actions'

export type SettleStudent = {
  id: string
  code: string
  name: string
  last_session_num: number | null
  monthly_sessions: number | null
  teacher_id: string | null
  teacher_name?: string
}

type Session = {
  id: string
  session_date: string
  session_num: number | null
  status: string
  notes: string | null
  session_duration: number | null
  teacher_name?: string
}

const isPresent = (s: string) => s === 'حاضر' || s === 'متأخر'

function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${key}-${String(last).padStart(2, '0')}`
}

function cairoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** تبويب «حصص المعلم عند الطالب»: بيعدّل سجل المعلم بس (حذف / إضافة حصة منسية) ومبيلمسش عدّاد الطالب. */
export function SettleShell({ initialStudents }: { initialStudents: SettleStudent[] }) {
  const [students] = useState<SettleStudent[]>(initialStudents || [])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<SettleStudent | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [newDate, setNewDate] = useState(cairoToday)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const [month] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const filtered = useMemo(() => {
    const t = norm(q)
    if (!t) return students.slice(0, 80)
    return students
      .filter((s) => {
        const name = norm(s.name || '')
        const code = norm(s.code || '')
        const teacher = norm(s.teacher_name || '')
        return name.includes(t) || code.includes(t) || teacher.includes(t)
      })
      .slice(0, 100)
  }, [q, students])

  async function loadStudentSessions(s: SettleStudent) {
    const supabase = createClient()
    const startDate = `${month}-01`
    const endDate = monthEnd(month)

    const { data, error } = await supabase
      .from('attendance')
      .select('id, session_date, session_num, status, notes, session_duration, teachers(name)')
      .eq('student_id', s.id)
      .gte('session_date', startDate)
      .lte('session_date', endDate)
      .order('session_date', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)

    setSessions(
      (data || []).map((r: any) => {
        const t = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers
        return {
          id: r.id,
          session_date: String(r.session_date).slice(0, 10),
          session_num: r.session_num,
          status: r.status,
          notes: r.notes,
          session_duration: r.session_duration,
          teacher_name: t?.name || '—',
        }
      })
    )
  }

  async function pick(s: SettleStudent) {
    setSelected(s)
    setMsg('')
    setSessions([])
    setNewDate(cairoToday())
    try {
      await loadStudentSessions(s)
    } catch (e: any) {
      setMsg(e?.message || 'فشل تحميل الحصص')
    }
  }

  function del(id: string) {
    if (!selected) return
    if (!confirm('حذف الحصة من سجل المعلم؟ عدّاد الطالب ما بيتغيّرش.')) return
    start(async () => {
      const r = await deleteAttendanceRow(id, selected.id)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'اتحذفت ✓')
        try {
          await loadStudentSessions(selected)
        } catch {
          /* ignore */
        }
      }
    })
  }

  function add() {
    if (!selected) return
    if (!newDate) {
      setMsg('اختار تاريخ')
      return
    }
    if (!confirm(`إضافة حصة منسية بتاريخ ${newDate} لسجل المعلم؟\nعدّاد الطالب مش هيتغيّر.`)) return
    start(async () => {
      const r = await addTeacherSession(selected.id, newDate)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'اتضافت ✓')
        try {
          await loadStudentSessions(selected)
        } catch {
          /* ignore */
        }
      }
    })
  }

  const presentCount = sessions.filter((s) => isPresent(s.status)).length

  return (
    <div className="px-4 space-y-3">
      {msg && (
        <p
          className="text-[13px] font-bold text-center rounded-xl py-2"
          style={{
            background: msg.includes('لا يمكن') || msg.includes('فشل') || msg.includes('غير') ? '#ffdad6' : '#e8f7f0',
            color: msg.includes('لا يمكن') || msg.includes('فشل') || msg.includes('غير') ? '#93000a' : '#176b52',
          }}
        >
          {msg}
        </p>
      )}

      {!selected && (
        <>
          <p className="text-[12px] rounded-xl px-3 py-2" style={{ background: '#fff8e8', color: '#6b5a1a' }}>
            هنا بتعدّل <b>سجل المعلم فقط</b>: حذف حصة غلط أو إضافة حصة منسية. عدّاد الطالب بيتعدّل من «تعديل بيانات طالب».
          </p>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو الكود أو اسم المعلم..."
            autoFocus
            className="w-full rounded-xl border px-3 py-3 text-[14px] bg-white"
            style={{ borderColor: '#176b52' }}
          />
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {q.trim() ? `${filtered.length} نتيجة` : `عرض ${filtered.length} من ${students.length}`}
          </p>
          <div className="card max-h-[70dvh] overflow-y-auto">
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-right px-3 py-3 border-b text-[13px] active:bg-[#e8f7f0]"
                style={{ borderColor: '#f0f5f2' }}
              >
                <span className="font-bold block">{s.name || '—'}</span>
                <span className="text-[11px]" style={{ color: '#6f7974' }}>
                  {s.code} · عداد {s.last_session_num ?? 0}/{s.monthly_sessions || '—'} · {s.teacher_name}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
                {students.length === 0 ? 'مفيش طلاب محمّلين' : 'مفيش نتيجة للبحث'}
              </p>
            )}
          </div>
        </>
      )}

      {selected && (
        <>
          <div className="card p-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-bold text-[15px]">{selected.name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {selected.code} · المعلم: {selected.teacher_name}
                </p>
              </div>
              <button
                type="button"
                className="text-[12px] font-bold underline shrink-0"
                style={{ color: '#176b52' }}
                onClick={() => {
                  setSelected(null)
                  setSessions([])
                  setMsg('')
                }}
              >
                تغيير
              </button>
            </div>

            <div className="mt-3 rounded-xl p-3 text-[12px] space-y-1" style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}>
              <p>
                عدّاد الطالب (للعرض فقط): <b>{selected.last_session_num ?? 0}</b>
                {selected.monthly_sessions ? ` / ${selected.monthly_sessions}` : ''}
              </p>
              <p>
                حصص حاضر هذا الشهر في سجل المعلم: <b>{presentCount}</b>
              </p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                لتعديل العدّاد روح{' '}
                <Link href={`/supervisor/edit-student?id=${selected.id}`} className="font-bold underline" style={{ color: '#176b52' }}>
                  تعديل بيانات طالب
                </Link>
              </p>
            </div>

            <div className="flex gap-2 mt-3 items-end">
              <div className="flex-1">
                <label className="text-[11px] font-bold">تاريخ حصة منسية</label>
                <input
                  type="date"
                  value={newDate}
                  max={cairoToday()}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-[13px]"
                  style={{ borderColor: '#176b52' }}
                />
              </div>
              <button type="button" disabled={pending} onClick={add} className="btn-primary px-4 py-2 text-[12px]">
                إضافة
              </button>
            </div>
          </div>

          <h3 className="text-[13px] font-bold">
            حصص {month} ({sessions.length})
          </h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="card p-3 text-[12px]">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">
                      {s.session_date}
                      {s.session_num != null ? ` · حصة ${s.session_num}` : ''}
                    </p>
                    <p style={{ color: '#6f7974' }}>
                      {s.status} · {s.teacher_name} · {s.session_duration || 30} د
                    </p>
                  </div>
                  <button type="button" disabled={pending} style={{ color: '#ba1a1a', fontWeight: 700 }} onClick={() => del(s.id)}>
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
                مفيش حصص للطالب في هذا الشهر
              </p>
            )}
          </div>

          <a
            href="/admin/payroll"
            className="block text-center text-[13px] font-bold py-3 rounded-xl text-white"
            style={{ background: '#755b1b' }}
          >
            فتح مسير الرواتب / الصرف ←
          </a>
        </>
      )}
    </div>
  )
}
