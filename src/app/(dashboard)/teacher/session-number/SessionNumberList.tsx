'use client'

import { useState, useTransition } from 'react'
import { setStudentSessionNumber } from '@/app/actions/attendance'

type S = { id: string; code: string; name: string; last_session_num: number | null; monthly_sessions: number | null }

export default function SessionNumberList({ students }: { students: S[] }) {
  const [q, setQ] = useState('')
  const [nums, setNums] = useState<Record<string, number>>(Object.fromEntries(students.map((s) => [s.id, s.last_session_num || 0])))
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [pending, start] = useTransition()

  function save(id: string, n: number) {
    start(async () => {
      const r: any = await setStudentSessionNumber(id, n)
      if (r?.error) setMsg((m) => ({ ...m, [id]: r.error }))
      else { setNums((x) => ({ ...x, [id]: r.num })); setMsg((m) => ({ ...m, [id]: '✓ اتحفظ' })) }
    })
  }

  const list = students.filter((s) => !q.trim() || s.name.includes(q.trim()) || s.code.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="space-y-2">
      <input className="input" placeholder="بحث باسم الطالب أو الكود..." value={q} onChange={(e) => setQ(e.target.value)} />
      {list.map((s) => (
        <div key={s.id} className="card p-3">
          <div className="flex items-center justify-between">
            <div><p className="font-bold text-[14px]">{s.name}</p><p className="text-[11px]" style={{ color: '#6f7974' }}>{s.code} · الباقة {s.monthly_sessions || 0} حصة</p></div>
            <div className="flex items-center gap-1.5">
              <button disabled={pending || nums[s.id] <= 0} onClick={() => save(s.id, nums[s.id] - 1)} className="w-9 h-9 rounded-full bg-white border border-[#e5efe8] font-bold">−</button>
              <input type="number" min={0} className="input !w-16 text-center !py-1.5" value={nums[s.id]} onChange={(e) => setNums((x) => ({ ...x, [s.id]: Number(e.target.value) }))} />
              <button disabled={pending} onClick={() => save(s.id, nums[s.id] + 1)} className="w-9 h-9 rounded-full bg-white border border-[#e5efe8] font-bold">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <button disabled={pending} onClick={() => save(s.id, nums[s.id])} className="text-[12px] font-bold" style={{ color: '#176b52' }}>حفظ الرقم</button>
            {msg[s.id] && <span className="text-[11px]" style={{ color: msg[s.id].includes('✓') ? '#176b52' : '#93000a' }}>{msg[s.id]}</span>}
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا طلاب</p>}
    </div>
  )
}
