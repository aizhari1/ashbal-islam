'use client'

import { useMemo, useState } from 'react'

type Session = {
  id: string
  date: string
  num: number | null
  rating: number | null
  price: number
}

type Group = {
  id: string
  name: string
  code: string
  duration: number
  packageSize: number
  price: number
  sessions: Session[]
}

export function StudentGroupsList({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return groups
    return groups.filter((g) => {
      const name = (g.name || '').toLowerCase()
      const code = (g.code || '').toLowerCase()
      return name.includes(term) || code.includes(term)
    })
  }, [q, groups])

  return (
    <div className="px-4 space-y-3">
      <div className="sticky top-0 z-10 pb-2" style={{ background: '#eefdf6' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن طالب بالاسم أو الكود..."
          className="w-full rounded-xl border px-3 py-3 text-[14px] bg-white shadow-sm"
          style={{ borderColor: '#176b52' }}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          {filtered.length} من {groups.length} طالب
        </p>
      </div>

      {filtered.length === 0 && (
        <div className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
          مفيش نتيجة لـ «{q}»
        </div>
      )}

      {filtered.map((g) => (
        <div key={g.id} className="card overflow-hidden">
          <div className="p-3.5 flex justify-between gap-2" style={{ background: '#f0faf5' }}>
            <div>
              <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>
                {g.name}
              </p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {g.code} · سعر {g.price} ج · {g.duration}د
                {g.packageSize > 0 ? ` · باقة ${g.packageSize}` : ''}
              </p>
            </div>
            <div className="text-left shrink-0">
              <p className="text-[15px] font-bold" style={{ color: '#176b52' }}>
                {g.sessions.length} حصة
              </p>
              <p className="text-[11px]">{(g.sessions.length * g.price).toLocaleString('en-US')} ج</p>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: '#e8f5ef' }}>
            {g.sessions.map((s, i) => (
              <div key={s.id} className="px-3.5 py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-[13px] font-semibold">{s.date}</p>
                  <p className="text-[10px]" style={{ color: '#6f7974' }}>
                    {s.num != null ? `حصة ${s.num}` : `#${i + 1}`}
                  </p>
                </div>
                <span className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                  {g.price} ج
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
