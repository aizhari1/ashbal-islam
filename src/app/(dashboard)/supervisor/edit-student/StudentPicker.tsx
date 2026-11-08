'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') || ''
  const [q, setQ] = useState(initialQ)
  // لما طالب متختار: القائمة مطوية افتراضياً عشان الفورم يبقى ظاهر، والبحث يفضل موجود
  const [listOpen, setListOpen] = useState(!selectedId)

  useEffect(() => {
    // لو اتغيّر الطالب من برا، اطوي القائمة
    if (selectedId) setListOpen(false)
  }, [selectedId])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase()
      const code = (s.code || '').toLowerCase()
      return name.includes(term) || code.includes(term)
    })
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
      <div className="sticky top-0 z-10 pt-1 pb-2" style={{ background: '#eefdf6' }}>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] font-bold" style={{ color: '#3f4944' }}>
            ابحث عن طالب
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
          placeholder="اكتب الاسم أو الكود..."
          className="w-full rounded-xl border px-3 py-3 text-[14px] mb-2 bg-white shadow-sm"
          style={{ borderColor: '#176b52' }}
          autoFocus={!selectedId}
        />

        {selected && !listOpen && (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
            style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: '#00513c' }}>
                {selected.name}
              </p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {selected.code}
                {selected.last_session_num != null ? ` · حصة ${selected.last_session_num}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="shrink-0 text-[12px] font-bold underline"
              style={{ color: '#176b52' }}
            >
              بحث تاني
            </button>
          </div>
        )}

        {listOpen && (
          <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
            {filtered.length} من {students.length} طالب · اضغط على الاسم للتعديل
          </p>
        )}
      </div>

      {listOpen && (
        <div className="card p-2 max-h-60 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && (
            <p className="text-center text-[12px] py-3" style={{ color: '#6f7974' }}>
              مفيش نتيجة لـ «{q}»
            </p>
          )}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(s.id)}
              className="w-full text-right text-[13px] py-2.5 px-2.5 rounded-lg"
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
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
