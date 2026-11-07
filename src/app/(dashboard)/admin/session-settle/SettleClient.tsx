'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteAttendanceRow, setStudentLastSession } from './actions'

type Student = {
  id: string
  code: string
  name: string
  last_session_num: number | null
  teacher_id: string | null
  teachers?: { name: string } | null
}

type Session = {
  id: string
  session_date: string
  session_num: number | null
  status: string
  notes: string | null
  session_duration: number | null
  teachers?: { name: string } | null
}

export function SettleClient({
  students,
  selectedId,
  month,
  sessions,
  selected,
}: {
  students: Student[]
  selectedId: string
  month: string
  sessions: Session[]
  selected: Student | null
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const [lastNum, setLastNum] = useState(String(selected?.last_session_num ?? 0))

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return students.slice(0, 40)
    return students.filter((s) => s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)).slice(0, 50)
  }, [q, students])

  function go(id: string) {
    router.push(`/admin/session-settle?student=${id}&month=${month}`)
  }

  function del(id: string) {
    if (!confirm('حذف الحصة دي من سجل المعلم؟')) return
    start(async () => {
      const r = await deleteAttendanceRow(id, selectedId)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('اتحذفت الحصة ✓')
        router.refresh()
      }
    })
  }

  function saveLast() {
    if (!selectedId) return
    start(async () => {
      const r = await setStudentLastSession(selectedId, Number(lastNum) || 0)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'تم تحديث رقم الحصة ✓')
        router.refresh()
      }
    })
  }

  return (
    <div className="px-4 space-y-3">
      {msg && (
        <p className="text-[13px] font-bold text-center rounded-xl py-2" style={{ background: '#e8f7f0', color: '#176b52' }}>
          {msg}
        </p>
      )}

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث باسم أو كود الطالب..."
        className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
        style={{ borderColor: '#cde8dc' }}
      />

      {!selectedId && (
        <div className="card max-h-64 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className="w-full text-right px-3 py-2.5 border-b text-[13px]"
              style={{ borderColor: '#f0f5f2' }}
            >
              <span className="font-bold">{s.name}</span>
              <span className="text-[11px]" style={{ color: '#6f7974' }}>
                {' '}
                ({s.code}) · حصة {s.last_session_num ?? 0} · {s.teachers?.name || '—'}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <div className="card p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-[15px]">{selected.name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {selected.code} · المعلم: {selected.teachers?.name || '—'} · رقم الحصة: {selected.last_session_num ?? 0}
                </p>
              </div>
              <button type="button" className="text-[11px] underline" onClick={() => router.push('/admin/session-settle')}>
                تغيير
              </button>
            </div>

            <div className="flex gap-2 mt-3 items-end">
              <div className="flex-1">
                <label className="text-[11px] font-bold">رقم آخر حصة (مزامنة مع المعلم)</label>
                <input
                  type="number"
                  min={0}
                  value={lastNum}
                  onChange={(e) => setLastNum(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-[13px]"
                  style={{ borderColor: '#176b52' }}
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={saveLast}
                className="btn-primary px-4 py-2 text-[12px]"
              >
                حفظ
              </button>
            </div>
            <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
              الزيادة بتضيف حصص عند المعلم · النقصان بيشيل الزايد من سجله
            </p>
          </div>

          <h3 className="text-[13px] font-bold">حصص {month} ({sessions.length})</h3>
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
                      {s.status} · {s.teachers?.name || '—'} · {s.session_duration || 30} د
                    </p>
                  </div>
                  <button type="button" disabled={pending} style={{ color: '#ba1a1a', fontWeight: 700 }} onClick={() => del(s.id)}>
                    حذف
                  </button>
                </div>
                {s.notes && (
                  <pre className="mt-1 text-[10px] whitespace-pre-wrap max-h-20 overflow-y-auto" style={{ color: '#3f4944' }}>
                    {s.notes.slice(0, 280)}
                  </pre>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
                مفيش حصص للطالب في هذا الشهر
              </p>
            )}
          </div>

          <Link href={`/admin/payroll`} className="block text-center text-[13px] font-bold py-2" style={{ color: '#176b52' }}>
            فتح الرواتب / التسوية المالية ←
          </Link>
        </>
      )}
    </div>
  )
}
