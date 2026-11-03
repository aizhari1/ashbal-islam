'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setEnrollmentStatus, deleteEnrollment, enrollStudentByCode, linkGuestToStudent } from '@/app/actions/courses'

const LABEL: Record<string, { t: string; c: string }> = {
  pending: { t: 'بانتظار التفعيل', c: 'badge-warn' },
  active: { t: 'مفعّل', c: 'badge-ok' },
  suspended: { t: 'موقوف', c: 'badge-err' },
}

export default function EnrollmentsPanel({ courseId, rows }: { courseId: string; rows: any[] }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<any>) => start(async () => { const r = await fn(); setMsg(r?.error || ''); if (!r?.error) router.refresh() })

  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-bold text-[14px]">المشتركين ({rows.length})</h2>

      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" className="input text-center" placeholder="كود الطالب ST-0001" />
        <button disabled={pending || !code.trim()} onClick={() => run(async () => { const r = await enrollStudentByCode(courseId, code); if (!r.error) setCode(''); return r })}
          className="btn-primary px-4 shrink-0 disabled:opacity-50">إضافة + تفعيل</button>
      </div>
      {msg && <p className="text-[12px]" style={{ color: '#93000a' }}>{msg}</p>}

      <ul className="space-y-2">
        {rows.map((r) => {
          const st = LABEL[r.status] || LABEL.pending
          const name = r.students?.name || r.guest_name || '—'
          return (
            <li key={r.id} className="bg-[#f4fbf7] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] truncate">{name}</p>
                  <p className="text-[11px]" style={{ color: '#6f7974' }} dir="ltr">
                    {r.students?.code ? r.students.code : r.guest_phone || ''}
                  </p>
                </div>
                <span className={st.c}>{st.t}</span>
              </div>

              {!r.student_id && (
                <div className="flex gap-2">
                  <input id={`link-${r.id}`} dir="ltr" className="input !py-1.5 text-[12px]" placeholder="اربطه بكود طالب" />
                  <button className="text-[12px] font-bold text-[#176b52] shrink-0"
                    onClick={() => { const v = (document.getElementById(`link-${r.id}`) as HTMLInputElement)?.value; if (v) run(() => linkGuestToStudent(r.id, courseId, v)) }}>ربط</button>
                </div>
              )}

              <div className="flex gap-2">
                {r.status !== 'active' ? (
                  <button disabled={pending || !r.student_id} onClick={() => run(() => setEnrollmentStatus(r.id, courseId, 'active'))}
                    className="btn-primary flex-1 py-2 text-[13px] disabled:opacity-40">
                    <span className="material-symbols-outlined text-[16px] ml-1">check_circle</span>تفعيل
                  </button>
                ) : (
                  <button disabled={pending} onClick={() => run(() => setEnrollmentStatus(r.id, courseId, 'suspended'))}
                    className="flex-1 py-2 rounded-lg text-[13px] font-bold" style={{ background: '#fff4d6', color: '#755b1b' }}>إيقاف</button>
                )}
                <button disabled={pending} onClick={() => { if (confirm('حذف الاشتراك؟')) run(() => deleteEnrollment(r.id, courseId)) }}
                  className="px-3 rounded-lg" style={{ background: '#ffdad6', color: '#93000a' }}>
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
              {!r.student_id && <p className="text-[11px]" style={{ color: '#755b1b' }}>زائر مش مسجّل كطالب — اربطه بكود طالب الأول عشان يتفعّل.</p>}
            </li>
          )
        })}
        {rows.length === 0 && <li className="text-[12px] text-center py-3" style={{ color: '#6f7974' }}>لا يوجد مشتركين بعد</li>}
      </ul>
    </section>
  )
}
