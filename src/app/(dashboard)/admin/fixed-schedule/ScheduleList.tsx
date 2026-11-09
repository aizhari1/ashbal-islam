'use client'

import { useMemo, useState } from 'react'
import ScheduleRow from './ScheduleRow'

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function hourOf(t: string | null | undefined): number {
  if (!t) return 12
  const h = Number(String(t).slice(0, 2))
  return Number.isFinite(h) ? h : 12
}

function isMorning(t: string | null | undefined) {
  return hourOf(t) < 12
}

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

  const byDay = useMemo(() => {
    const map = new Map<number, { morning: any[]; evening: any[] }>()
    for (let i = 0; i < 7; i++) map.set(i, { morning: [], evening: [] })
    for (const e of filtered) {
      const d = Number(e.day_of_week)
      if (!(d >= 0 && d <= 6)) continue
      const bucket = map.get(d)!
      if (isMorning(e.start_time)) bucket.morning.push(e)
      else bucket.evening.push(e)
    }
    for (const b of map.values()) {
      b.morning.sort((a, c) => String(a.start_time || '').localeCompare(String(c.start_time || '')))
      b.evening.sort((a, c) => String(a.start_time || '').localeCompare(String(c.start_time || '')))
    }
    return map
  }, [filtered])

  const daysToShow = day !== '' ? [Number(day)] : [0, 1, 2, 3, 4, 5, 6]

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
          ظاهر {filtered.length} من {entries.length} · مقسّم يوم / صباح / مساء
        </p>
      </div>

      <div className="space-y-4">
        {daysToShow.map((d) => {
          const bucket = byDay.get(d) || { morning: [], evening: [] }
          const total = bucket.morning.length + bucket.evening.length
          if (total === 0) return null
          return (
            <section key={d}>
              <div
                className="rounded-xl px-3 py-2 mb-2 flex justify-between items-center"
                style={{ background: '#176b52' }}
              >
                <h3 className="text-white text-[14px] font-bold">{DAY_NAMES[d]}</h3>
                <span className="text-white text-[11px] opacity-90">{total} موعد</span>
              </div>

              {bucket.morning.length > 0 && (
                <div className="mb-3">
                  <p className="text-[12px] font-bold mb-1.5 px-1" style={{ color: '#b45309' }}>
                    ☀ صباح ({bucket.morning.length})
                  </p>
                  <div className="space-y-2">
                    {bucket.morning.map((e) => (
                      <ScheduleRow key={e.id} e={e} teachers={teachers} />
                    ))}
                  </div>
                </div>
              )}

              {bucket.evening.length > 0 && (
                <div className="mb-2">
                  <p className="text-[12px] font-bold mb-1.5 px-1" style={{ color: '#1e3a5f' }}>
                    ☾ مساء ({bucket.evening.length})
                  </p>
                  <div className="space-y-2">
                    {bucket.evening.map((e) => (
                      <ScheduleRow key={e.id} e={e} teachers={teachers} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        })}
        {filtered.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            مفيش نتائج
          </p>
        )}
      </div>
    </div>
  )
}
