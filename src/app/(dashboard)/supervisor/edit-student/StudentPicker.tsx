'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Student = {
  id: string
  code: string
  name: string
  last_session_num?: number | null
  status?: string | null
  teacher_name?: string | null
}

export function StudentPicker({
  students,
  selectedId,
}: {
  students: Student[]
  selectedId?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [listOpen, setListOpen] = useState(!selectedId)

  useEffect(() => {
    if (selectedId) setListOpen(false)
  }, [selectedId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students.slice(0, 80)
    return students
      .filter((s) => {
        const name = (s.name || '').toLowerCase()
        const code = (s.code || '').toLowerCase()
        const teacher = (s.teacher_name || '').toLowerCase()
        return name.includes(term) || code.includes(term) || teacher.includes(term)
      })
      .slice(0, 100)
  }, [q, students])

  const selected = students.find((s) => s.id === selectedId)

  function go(id: string | null) {
    const params = new URLSearchParams()
    if (id) params.set('id', id)
    if (q.trim()) params.set('q', q.trim())
    const qs = params.toString()
    router.push(qs ? `/supervisor/edit-student?${qs}` : '/supervisor/edit-student')
  }

  function onSearchChange(value: string) {
    setQ(value)
    setListOpen(true)
  }

  return (
    <div className="px-4 mb-3">
      <div className="sticky top-0 z-20 pt-1 pb-2" style={{ background: '#eefdf6' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[13px] font-extrabold" style={{ color: '#00513c' }}>
            🔍 ابحث عن طالب
          </p>
          {selectedId && (
            <button
              type="button"
              onClick={() => {
                setListOpen(true)
                setQ('')
              }}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#e8f7f0', color: '#176b52' }}
            >
              تغيير الطالب
            </button>
          )}
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setListOpen(true)}
          placeholder="اكتب الاسم أو الكود أو المعلم..."
          className="w-full rounded-xl border-2 px-3 py-3.5 text-[15px] bg-white shadow-sm"
          style={{ borderColor: '#176b52' }}
          autoFocus={!selectedId}
          autoComplete="off"
        />
        <p className="text-[11px] mt-1 font-semibold" style={{ color: '#6f7974' }}>
          {q.trim() ? `${filtered.length} نتيجة` : `اكتب للبحث · ${students.length} طالب`}
        </p>
      </div>

      {selected && !listOpen && (
        <div
          className="rounded-2xl px-3 py-3 mb-2 flex justify-between items-center"
          style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
        >
          <div>
            <p className="font-bold text-[14px]" style={{ color: '#00513c' }}>
              {selected.name}
            </p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              {selected.code}
              {selected.last_session_num != null ? ` · حصة ${selected.last_session_num}` : ''}
              {selected.status ? ` · ${selected.status}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="text-[12px] font-bold underline"
            style={{ color: '#176b52' }}
            onClick={() => setListOpen(true)}
          >
            بحث تاني
          </button>
        </div>
      )}

      {listOpen && (
        <div
          className="rounded-2xl border bg-white max-h-72 overflow-y-auto shadow-sm"
          style={{ borderColor: '#cde8dc' }}
        >
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className="w-full text-right px-3 py-3 border-b last:border-0"
              style={{
                borderColor: '#f0f5f2',
                background: s.id === selectedId ? '#e8f7f0' : undefined,
              }}
            >
              <span className="font-bold text-[14px] block">{s.name}</span>
              <span className="text-[11px]" style={{ color: '#6f7974' }}>
                {s.code}
                {s.teacher_name ? ` · ${s.teacher_name}` : ''}
                {s.last_session_num != null ? ` · حصة ${s.last_session_num}` : ''}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
              مفيش نتيجة لـ «{q}»
            </p>
          )}
        </div>
      )}
    </div>
  )
}
