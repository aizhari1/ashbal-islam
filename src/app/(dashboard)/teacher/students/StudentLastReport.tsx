'use client'

import { useState } from 'react'
import { waLink } from '@/lib/whatsapp'

export default function StudentLastReport({
  phone,
  last,
}: {
  phone: string | null
  last: { notes: string; session_date: string; session_num: number | null } | null
}) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  if (!last?.notes?.trim()) {
    return (
      <p className="text-[11px] mt-2" style={{ color: '#6f7974' }}>
        لا يوجد تقرير سابق
      </p>
    )
  }

  const report = last.notes.trim()

  function copy() {
    navigator.clipboard?.writeText(report).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e5efe8' }}>
      <button
        type="button"
        className="text-[11px] font-bold"
        style={{ color: '#176b52' }}
        onClick={() => setOpen(!open)}
      >
        {open ? 'إخفاء آخر تقرير' : `آخر تقرير · ${last.session_date}${last.session_num ? ` · حصة ${last.session_num}` : ''}`}
      </button>

      {open && (
        <pre
          className="text-[11px] leading-relaxed whitespace-pre-wrap mt-1.5 max-h-36 overflow-y-auto rounded-lg p-2"
          style={{ background: '#f4faf7' }}
          dir="rtl"
        >
          {report}
        </pre>
      )}

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          onClick={copy}
          className="py-2 rounded-xl text-[12px] font-bold"
          style={{ background: '#e8f7f0', color: '#176b52' }}
        >
          {copied ? '✓ تم النسخ' : 'نسخ التقرير'}
        </button>
        <a
          href={waLink(phone, report)}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 rounded-xl text-[12px] font-bold text-white text-center"
          style={{ background: '#25D366' }}
        >
          واتساب
        </a>
      </div>
    </div>
  )
}
