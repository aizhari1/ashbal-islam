'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export type LiveStudent = {
  id: string
  code: string
  name: string
  status?: string | null
  amount_due?: number | null
  join_date?: string | null
  created_at?: string | null
  teachers?: { name: string } | null
  tenure?: string
}

function statusBadge(s: string) {
  if (s === 'نشط') return 'badge-ok'
  if (s === 'موقوف' || s === 'تجريبي') return 'badge-warn'
  return 'badge-err'
}

export function StudentsLiveSearch({
  students,
  hrefPrefix = '/admin/students',
}: {
  students: LiveStudent[]
  hrefPrefix?: string
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase()
      const code = (s.code || '').toLowerCase()
      const teacher = (s.teachers?.name || '').toLowerCase()
      const phone = String((s as any).phone || '').toLowerCase()
      return name.includes(term) || code.includes(term) || teacher.includes(term) || phone.includes(term)
    })
  }, [q, students])

  return (
    <div>
      <div className="sticky top-14 z-20 mb-3 pt-1 pb-2" style={{ background: '#eefdf6' }}>
        <label className="block text-[12px] font-bold mb-1.5" style={{ color: '#3f4944' }}>
          ابحث عن طالب
        </label>
        <div className="relative">
          <span
            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[22px]"
            style={{ color: '#176b52' }}
          >
            search
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اكتب الاسم أو الكود أو اسم المعلم..."
            className="w-full rounded-xl border-2 px-3 py-3 pr-11 text-[14px] bg-white shadow-sm"
            style={{ borderColor: '#176b52' }}
            autoComplete="off"
          />
        </div>
        <p className="text-[11px] mt-1.5 font-semibold" style={{ color: '#6f7974' }}>
          {q.trim() ? `${filtered.length} نتيجة` : `${students.length} طالب`} · البحث فوري وأنت بتكتب
        </p>
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <Link key={s.id} href={`${hrefPrefix}/${s.id}`} className="card flex items-center gap-3 p-3.5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px]"
              style={{ background: '#e8f7f0', color: '#176b52' }}
            >
              {s.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold truncate">{s.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#6f7974' }}>
                {s.code} · {s.teachers?.name || 'بدون معلم'}
              </p>
              {s.tenure && (
                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#176b52' }}>
                  منذ {s.tenure}
                </p>
              )}
            </div>
            <div className="text-left flex flex-col items-end gap-1">
              <span className={statusBadge(s.status || '')}>{s.status}</span>
              {Number(s.amount_due) > 0 && (
                <span className="text-[11px] font-bold" style={{ color: '#ba1a1a' }}>
                  {s.amount_due}
                </span>
              )}
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card p-8 text-center" style={{ color: '#6f7974' }}>
            مفيش نتيجة{q.trim() ? ` لـ «${q}»` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
