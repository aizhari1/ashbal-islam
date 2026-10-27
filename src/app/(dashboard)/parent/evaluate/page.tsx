'use client'

import { useState } from 'react'
import Link from 'next/link'

const CRITERIA = [
  { id: 'tajweed', label: 'التجويد والمخارج' },
  { id: 'hifz', label: 'الحفظ والإتقان' },
  { id: 'commitment', label: 'الالتزام والحضور' },
  { id: 'behavior', label: 'السلوك والأدب' },
  { id: 'progress', label: 'التقدم العام' },
]

export default function ParentEvaluatePage() {
  const [stars, setStars] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
          <span className="material-symbols-outlined text-[48px] text-[#176b52]">check_circle</span>
          <h2 className="text-[18px] font-bold mt-2">تم إرسال التقييم</h2>
          <p className="text-[13px] text-[#6f7974] mt-1">شكراً لمشاركتكم</p>
          <Link href="/parent" className="inline-block mt-4 text-[#176b52] font-bold">العودة</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/parent" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">التقييم الشهري لولي الأمر</h1>
      </header>
      <main className="px-4 pb-24 space-y-4">
        <p className="text-[13px] text-[#6f7974]">قيّم من 1 إلى 5 نجوم</p>
        {CRITERIA.map(c => (
          <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[14px] font-semibold mb-2">{c.label}</p>
            <div className="flex gap-1" dir="ltr">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setStars(p => ({ ...p, [c.id]: n }))} className="p-1">
                  <span className="material-symbols-outlined text-[28px]" style={{
                    color: (stars[c.id] || 0) >= n ? '#c5a45d' : '#bec9c2',
                    fontVariationSettings: (stars[c.id] || 0) >= n ? "'FILL' 1" : undefined
                  }}>star</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-[13px] font-medium">ملاحظات</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            className="w-full mt-2 bg-[#eefdf6] rounded-xl p-3 text-[14px] outline-none border border-[#e5efe8]"
            placeholder="اكتب ملاحظاتك..." />
        </div>
        <button onClick={() => setSent(true)} className="w-full bg-[#176b52] text-white py-3.5 rounded-2xl font-bold">
          إرسال التقييم
        </button>
      </main>
    </div>
  )
}
