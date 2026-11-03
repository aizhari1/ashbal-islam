'use client'

import { useMemo, useState } from 'react'

export type SearchStudent = {
  id: string
  code: string
  name: string
  status?: string | null
  amount_due?: number | null
  teacher_name?: string | null
  last_session_num?: number | null
}

type Props = {
  students: SearchStudent[]
  selectedId?: string | null
  onSelect: (s: SearchStudent | null) => void
  placeholder?: string
  label?: string
  maxResults?: number
}

/** بحث واختيار طالب بالاسم أو الكود — مكوّن موحّد */
export default function StudentSearchSelect({
  students,
  selectedId,
  onSelect,
  placeholder = 'اسم أو كود الطالب...',
  label = 'ابحث عن الطالب',
  maxResults = 40,
}: Props) {
  const [q, setQ] = useState('')

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId) || null,
    [students, selectedId]
  )

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = !term
      ? students
      : students.filter((s) => {
          const name = (s.name || '').toLowerCase()
          const code = (s.code || '').toLowerCase()
          return name.includes(term) || code.includes(term)
        })
    return list.slice(0, maxResults)
  }, [q, students, maxResults])

  if (selected) {
    return (
      <div className="rounded-xl border px-3 py-2.5 bg-white" style={{ borderColor: '#cde8dc' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color: '#00513c' }}>
              {selected.name}
            </p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              {selected.code}
              {selected.status ? ` · ${selected.status}` : ''}
              {selected.teacher_name ? ` · ${selected.teacher_name}` : ''}
              {selected.amount_due != null
                ? ` · مستحق ${Number(selected.amount_due).toLocaleString('ar-EG')} ج`
                : ''}
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] font-bold underline flex-shrink-0"
            style={{ color: '#176b52' }}
            onClick={() => {
              onSelect(null)
              setQ('')
            }}
          >
            تغيير
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
        {label}
      </label>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
        style={{ borderColor: '#cde8dc' }}
        autoComplete="off"
      />
      <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border bg-white" style={{ borderColor: '#e5efe8' }}>
        {filtered.length === 0 && (
          <p className="text-center text-[12px] py-3" style={{ color: '#6f7974' }}>
            {q.trim() ? `مفيش نتيجة لـ «${q}»` : 'اكتب للبحث...'}
          </p>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onSelect(s)
              setQ('')
            }}
            className="w-full text-right px-3 py-2.5 border-b last:border-0 hover:bg-[#e8f7f0]"
            style={{ borderColor: '#f0f5f2' }}
          >
            <span className="block text-[13px] font-semibold" style={{ color: '#1a1c1b' }}>
              {s.name}
            </span>
            <span className="block text-[11px]" style={{ color: '#6f7974' }}>
              {s.code}
              {s.status ? ` · ${s.status}` : ''}
              {s.amount_due != null && Number(s.amount_due) > 0
                ? ` · ${Number(s.amount_due).toLocaleString('ar-EG')} ج`
                : ''}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
        {filtered.length} نتيجة
      </p>
    </div>
  )
}
