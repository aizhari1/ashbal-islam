'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteAttendanceRow, setStudentLastSession } from './actions'

type Student = {
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

function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${key}-${String(last).padStart(2, '0')}`
}

function packageLabel(n: number | null | undefined): string {
  const q = Number(n) || 0
  return q > 0 ? `باقة ${q}` : 'باقة غير محددة'
}

export function SettleShell() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [maxTeacherNum, setMaxTeacherNum] = useState(0)
  const [teacherPresentCount, setTeacherPresentCount] = useState(0)
  const [lastNum, setLastNum] = useState('0')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const [month] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('students')
          .select('id, code, name, last_session_num, monthly_sessions, teacher_id, teachers(name)')
          .in('status', ['نشط', 'موقوف', 'تجريبي'])
          .order('name')
          .limit(800)
        if (error) throw new Error(error.message)
        if (cancelled) return
        const list: Student[] = (data || []).map((s: any) => {
          const t = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers
          return {
            id: s.id,
            code: s.code,
            name: s.name,
            last_session_num: s.last_session_num,
            monthly_sessions: s.monthly_sessions != null ? Number(s.monthly_sessions) : null,
            teacher_id: s.teacher_id,
            teacher_name: t?.name || '—',
          }
        })
        setStudents(list)
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'فشل تحميل الطلاب')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return students.slice(0, 50)
    return students
      .filter((s) => s.name.toLowerCase().includes(t) || (s.code || '').toLowerCase().includes(t))
      .slice(0, 60)
  }, [q, students])

  async function loadStudentSessions(s: Student) {
    const supabase = createClient()
    const startDate = `${month}-01`
    const endDate = monthEnd(month)

    const [monthRes, statsRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('id, session_date, session_num, status, notes, session_duration, teachers(name)')
        .eq('student_id', s.id)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: false })
        .limit(200),
      supabase
        .from('attendance')
        .select('session_num, status')
        .eq('student_id', s.id)
        .in('status', ['حاضر', 'متأخر'])
        .limit(500),
    ])

    if (monthRes.error) throw new Error(monthRes.error.message)
    if (statsRes.error) throw new Error(statsRes.error.message)

    setSessions(
      (monthRes.data || []).map((r: any) => {
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

    const rows = statsRes.data || []
    setTeacherPresentCount(rows.length)
    let maxN = 0
    for (const r of rows) {
      const n = Number(r.session_num)
      if (Number.isFinite(n) && n > maxN) maxN = n
    }
    setMaxTeacherNum(maxN)
  }

  async function pick(s: Student) {
    setSelected(s)
    setLastNum(String(s.last_session_num ?? 0))
    setMsg('')
    setSessions([])
    setMaxTeacherNum(0)
    setTeacherPresentCount(0)
    try {
      await loadStudentSessions(s)
    } catch (e: any) {
      setMsg(e?.message || 'فشل تحميل الحصص')
    }
  }

  function del(id: string) {
    if (!selected) return
    if (!confirm('حذف الحصة دي نهائيًا من عند الإدارة والمعلم؟')) return
    start(async () => {
      const r = await deleteAttendanceRow(id, selected.id)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'اتحذفت من عند الجميع ✓')
        if (typeof r?.last_session_num === 'number') {
          const n = r.last_session_num
          setLastNum(String(n))
          setSelected({ ...selected, last_session_num: n })
          setStudents((prev) =>
            prev.map((x) => (x.id === selected.id ? { ...x, last_session_num: n } : x))
          )
        }
        try {
          await loadStudentSessions(selected)
        } catch {
          /* ignore */
        }
      }
    })
  }

  function saveLast() {
    if (!selected) return
    const n = Number(lastNum) || 0
    const pkg = Number(selected.monthly_sessions) || 0
    if (pkg > 0 && n > pkg) {
      setMsg(`لا يمكن حفظ رقم ${n} — الباقة ${pkg} حصص فقط`)
      return
    }
    const studentNum = Number(selected.last_session_num) || 0
    const teacherMax = maxTeacherNum
    let confirmMsg = `تأكيد المزامنة على الرقم ${n}؟`
    if (n > teacherMax) {
      confirmMsg = `الطالب هيبقى على ${n} والمعلم حالياً أعلى رقم عنده ${teacherMax}.\nهتتضاف الحصص الناقصة فقط (${teacherMax + 1} ← ${n}) لسجل المعلم.\nمتأكد؟`
    } else if (n < teacherMax) {
      confirmMsg = `الطالب هيبقى على ${n} والمعلم عنده حصص بأرقام أكبر من ${n}.\nهتتشال الحصص الزيادة من سجل المعلم.\nمتأكد؟`
    } else if (n === studentNum && n === teacherMax) {
      confirmMsg = `الرقم ${n} متطابق أصلاً. تحفظ تاني؟`
    }
    if (!confirm(confirmMsg)) return

    start(async () => {
      const r = await setStudentLastSession(selected.id, n)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'تم ✓')
        setSelected({ ...selected, last_session_num: n })
        setStudents((prev) =>
          prev.map((x) => (x.id === selected.id ? { ...x, last_session_num: n } : x))
        )
        try {
          await loadStudentSessions({ ...selected, last_session_num: n })
        } catch {
          /* ignore */
        }
      }
    })
  }

  const selectedPkg = Number(selected?.monthly_sessions) || 0
  const studentNum = Number(selected?.last_session_num) || 0
  const mismatch = selected && studentNum !== maxTeacherNum

  return (
    <div className="px-4 space-y-3">
      {msg && (
        <p
          className="text-[13px] font-bold text-center rounded-xl py-2"
          style={{
            background: msg.includes('لا يمكن') || msg.includes('فشل') ? '#ffdad6' : '#e8f7f0',
            color: msg.includes('لا يمكن') || msg.includes('فشل') ? '#93000a' : '#176b52',
          }}
        >
          {msg}
        </p>
      )}
      {err && (
        <p className="text-[13px] font-bold text-center rounded-xl py-2" style={{ background: '#ffdad6', color: '#93000a' }}>
          {err}
        </p>
      )}

      {!selected && (
        <>
          <p className="text-[12px] rounded-xl px-3 py-2" style={{ background: '#fff8e8', color: '#6b5a1a' }}>
            التسوية هنا هي اللي بتزامِن عداد الطالب مع سجل المعلم. تعديل بيانات الطالب لوحده ما بيضيفش ولا بيحذف حصص.
          </p>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم أو كود الطالب..."
            autoFocus
            className="w-full rounded-xl border px-3 py-3 text-[14px] bg-white"
            style={{ borderColor: '#176b52' }}
          />
          {loading && (
            <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
              جاري تحميل الطلاب...
            </p>
          )}
          {!loading && (
            <div className="card max-h-[70dvh] overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s)}
                  className="w-full text-right px-3 py-3 border-b text-[13px] active:bg-[#e8f7f0]"
                  style={{ borderColor: '#f0f5f2' }}
                >
                  <span className="font-bold block">{s.name}</span>
                  <span className="text-[11px]" style={{ color: '#6f7974' }}>
                    {s.code} · عداد {s.last_session_num ?? 0}/{s.monthly_sessions || '—'} ·{' '}
                    <span style={{ color: '#176b52', fontWeight: 700 }}>{packageLabel(s.monthly_sessions)}</span>
                    {' · '}{s.teacher_name}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
                  مفيش نتيجة
                </p>
              )}
            </div>
          )}
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

            <div
              className="mt-3 rounded-xl p-3 text-[12px] space-y-1"
              style={{
                background: mismatch ? '#fff4e5' : '#e8f7f0',
                border: `1px solid ${mismatch ? '#f0c070' : '#cde8dc'}`,
              }}
            >
              <p className="font-bold" style={{ color: mismatch ? '#8a5a00' : '#176b52' }}>
                {mismatch ? 'غير متطابق — محتاج تسوية' : 'متطابق ✓'}
              </p>
              <p>
                عداد الطالب: <b>{studentNum}</b>
                {selectedPkg > 0 ? ` / ${selectedPkg}` : ''}
              </p>
              <p>
                أعلى رقم في سجل المعلم: <b>{maxTeacherNum}</b>
              </p>
              <p>
                عدد حصص حاضر/متأخر مسجّلة: <b>{teacherPresentCount}</b>
              </p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                مثال: لو العداد 7 والمعلم واصل 2 فقط → اكتب 7 واحفظ، هتتضاف 3 و4 و5 و6 و7 فقط.
                لو عايز تخليه على واقع المعلم اكتب 2 واحفظ، هيتشال الزائد.
              </p>
            </div>

            <div className="flex gap-2 mt-3 items-end">
              <div className="flex-1">
                <label className="text-[11px] font-bold">
                  الرقم المستهدف بعد التسوية{selectedPkg > 0 ? ` (حد ${selectedPkg})` : ''}
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedPkg > 0 ? selectedPkg : undefined}
                  value={lastNum}
                  onChange={(e) => setLastNum(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-[13px]"
                  style={{ borderColor: '#176b52' }}
                />
              </div>
              <button type="button" disabled={pending} onClick={saveLast} className="btn-primary px-4 py-2 text-[12px]">
                مزامنة
              </button>
            </div>
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
                      {selectedPkg > 0 && s.session_num != null ? ` / ${selectedPkg}` : ''}
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
