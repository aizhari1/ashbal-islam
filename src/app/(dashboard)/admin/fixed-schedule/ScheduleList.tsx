'use client'

import { useMemo, useState } from 'react'
import ScheduleRow from './ScheduleRow'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function ScheduleList({
  entries,
  teachers,
}: {
  entries: any[]
  teachers: { id: string; name: string }[]
}) {
  const [q, setQ] = useState('')
  const [day, setDay] = useState<string>('')

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return entries.filter((e) => {
      if (day !== '' && String(e.day_of_week) !== day) return false
      if (!qq) return true
      const name = String(e.students?.name || '').toLowerCase()
      const code = String(e.students?.code || '').toLowerCase()
      const tname = String(e.teachers?.name || '').toLowerCase()
      return name.includes(qq) || code.includes(qq) || tname.includes(qq)
    })
  }, [entries, q, day])

  return (
    <div>
      <div className="card p-3 mb-3 space-y-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input"
          placeholder="بحث: اسم طالب / كود / معلم..."
        />
        <select value={day} onChange={(e) => setDay(e.target.value)} className="input">
          <option value="">كل الأيام</option>
          {DAY_NAMES.map((l, i) => (
            <option key={i} value={String(i)}>
              {l}
            </option>
          ))}
        </select>
        <p className="text-[11px]" style={{ color: '#6f7974' }}>
          ظاهر {filtered.length} من {entries.length}
        </p>
      </div>
      <div className="space-y-2">
        {filtered.map((e) => (
          <ScheduleRow key={e.id} e={e} teachers={teachers} />
        ))}
        {filtered.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            مفيش نتائج
          </p>
        )}
      </div>
    </div>
  )
}
