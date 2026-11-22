'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'

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
  const [month, setMonth] = useState(() => {
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

  async function loadStudentSessions(s: SettleStudent, m: string = month) {
    const url = `/api/admin/session-settle/sessions?studentId=${encodeURIComponent(s.id)}&month=${encodeURIComponent(m)}`
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' })
    const r = await res.json().catch(() => ({}))
    if (!res.ok || r.error) throw new Error(r.error || `فشل التحميل (${res.status})`)
    setSessions((r.sessions || []) as Session[])
  }

  function shiftMonth(delta: number) {
    if (!selected) return
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    setMonth(key)
    setMsg('')
    loadStudentSessions(selected, key).catch((e: any) => setMsg(e?.message || 'فشل تحميل الحصص'))
  }

  async function pick(s: SettleStudent) {
    setSelected(s)
    setMsg('')
    setSessions([])
    try {
      await loadStudentSessions(s)
    } catch (e: any) {
      setMsg(e?.message || 'فشل تحميل الحصص')
    }
  }

  function del(id: string) {
    if (!selected) return
    if (!confirm('حذف الحصة من سجل المعلم؟ (عدّاد الطالب مش هيتأثر)')) return
    start(async () => {
      setMsg('')
      try {
        const url = `/api/admin/session-settle/sessions?id=${encodeURIComponent(id)}&studentId=${encodeURIComponent(selected.id)}`
        const res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' })
        const r = await res.json().catch(() => ({}))
        if (!res.ok || r.error) {
          setMsg(r.error || 'فشل الحذف')
          return
        }
        setMsg(r.message || 'تم الحذف')
        await loadStudentSessions(selected)
      } catch (e: any) {
        setMsg(e?.message || 'فشل الحذف')
      }
    })
  }

  function add() {
    if (!selected) return
    start(async () => {
      setMsg('')
      try {
        const res = await fetch('/api/admin/session-settle/sessions', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: selected.id, date: newDate }),
        })
        const r = await res.json().catch(() => ({}))
        if (!res.ok || r.error) {
          setMsg(r.error || 'فشل الإضافة')
          return
        }
        setMsg(r.message || 'تمت الإضافة')
        await loadStudentSessions(selected)
      } catch (e: any) {
        setMsg(e?.message || 'فشل الإضافة')
      }
    })
  }

  const presentCount = sessions.filter((s) => isPresent(s.status)).length

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2">
        <label className="text-[12px] font-bold block">بحث (اسم / كود / معلم)</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اكتب اسم أو كود أو معلم..."
          className="w-full rounded-xl border px-3 py-2 text-[13px]"
          style={{ borderColor: '#176b52' }}
        />
        <div className="max-h-56 overflow-y-auto space-y-1">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className="w-full text-right px-3 py-2 rounded-xl text-[12px]"
              style={{
                background: selected?.id === s.id ? '#e8f7f0' : '#fff',
                border: selected?.id === s.id ? '1px solid #176b52' : '1px solid #e0ebe6',
              }}
            >
              <span className="font-bold">{s.name}</span>
              <span className="opacity-70"> · {s.code}</span>
              {s.teacher_name ? <span className="opacity-70"> · {s.teacher_name}</span> : null}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[12px] py-4" style={{ color: '#6f7974' }}>
              مفيش نتائج
            </p>
          )}
        </div>
      </div>

      {msg && (
        <p
          className="text-[12px] font-bold text-center px-2"
          style={{ color: msg.includes('فشل') || msg.includes('غير') ? '#ba1a1a' : '#176b52' }}
        >
          {msg}
        </p>
      )}

      {selected && (
        <>
          <div className="card p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-[14px] font-bold">{selected.name}</p>
                <p className="text-[12px]" style={{ color: '#6f7974' }}>
                  {selected.code}
                  {selected.teacher_name ? ` · ${selected.teacher_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] font-bold"
                style={{ color: '#176b52' }}
                onClick={() => setSelected(null)}
              >
                إغلاق
              </button>
            </div>
            <div className="text-[12px] space-y-1">
              <p>
                عدّاد الطالب: <b>{selected.last_session_num ?? 0}</b>
                {selected.monthly_sessions ? ` / ${selected.monthly_sessions}` : ''}
              </p>
              <p>
                حصص حاضر في الشهر المعروض في سجل المعلم: <b>{presentCount}</b>
              </p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                لتعديل العدّاد روح{' '}
                <Link href={`/supervisor/edit-student?id=${selected.id}`} className="font-bold underline">
                  تعديل الطالب
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <div className="flex-1 min-w-[140px]">
                <label className="text-[11px] font-bold block mb-1">تاريخ حصة منسية</label>
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

          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold">
              حصص {month} ({sessions.length})
            </h3>
            <div className="flex gap-2 text-[12px] font-bold">
              <button type="button" className="px-3 py-1 rounded-lg bg-white border" onClick={() => shiftMonth(-1)}>
                ← الشهر السابق
              </button>
              <button type="button" className="px-3 py-1 rounded-lg bg-white border" onClick={() => shiftMonth(1)}>
                الشهر التالي →
              </button>
            </div>
          </div>
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
                  <button
                    type="button"
                    disabled={pending}
                    style={{ color: '#ba1a1a', fontWeight: 700 }}
                    onClick={() => del(s.id)}
                  >
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
