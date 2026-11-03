'use client'

import { useState } from 'react'

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {items.map((it, i) => (
        <div key={i} className="lp-card !rounded-2xl overflow-hidden" style={{ transform: 'none' }}>
          <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between gap-3 p-5 text-right bg-transparent border-0 cursor-pointer font-bold text-[15px] text-[#00513c]">
            {it.q}
            <span className="material-symbols-outlined transition-transform" style={{ transform: open === i ? 'rotate(180deg)' : 'none' }}>expand_more</span>
          </button>
          <div className={`lp-faq-body ${open === i ? 'open' : ''}`}><div><p className="px-5 pb-5 text-[14px] leading-7 text-[#3f4944]">{it.a}</p></div></div>
        </div>
      ))}
    </div>
  )
}
