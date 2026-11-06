'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type Student = {
  id: string
  code: string
  name: string
  last_session_num?: number | null
  status?: string | null
}

export function StudentPicker({
  students,
  selectedId,
}: {
  students: Student[]
  selectedId?: string
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase()
      const code = (s.code || '').toLowerCase()
      return name.includes(term) || code.includes(term)
    })
  }, [q, students])

  return (
    <div className="px-4 mb-3">
      <div className="sticky top-0 z-10 pt-1 pb-2" style={{ background: '#eefdf6' }}>
        <p className="text-[12px] font-bold mb-1.5" style={{ color: '#3f4944' }}>
          ابحث عن طالب
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اكتب الاسم أو الكود..."
          className="w-full rounded-xl border px-3 py-3 text-[14px] mb-2 bg-white shadow-sm"
          style={{ borderColor: '#176b52' }}
          autoFocus
        />
        <p className="text-[10px]" style={{ color: '#6f7974' }}>
          {filtered.length} من {students.length} طالب
        </p>
      </div>

      <div className="card p-2 max-h-60 overflow-y-auto space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-center text-[12px] py-3" style={{ color: '#6f7974' }}>
            مفيش نتيجة لـ «{q}»
          </p>
        )}
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/supervisor/edit-student?id=${s.id}`}
            className="block text-[13px] py-2.5 px-2.5 rounded-lg"
            style={{
              background: selectedId === s.id ? '#e8f7f0' : 'transparent',
              color: '#1a1c1b',
              fontWeight: selectedId === s.id ? 700 : 400,
            }}
          >
            <span>{s.name}</span>{' '}
            <span style={{ color: '#6f7974' }}>({s.code})</span>
            {s.last_session_num != null && (
              <span className="text-[11px] mr-1" style={{ color: '#176b52' }}>
                · حصة {s.last_session_num}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
