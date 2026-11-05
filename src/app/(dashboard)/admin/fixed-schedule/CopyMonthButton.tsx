'use client'

import { useState, useTransition } from 'react'
import { copyScheduleMonth } from '@/app/actions/schedule'

export function CopyMonthButton() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  return (
    <div className="card p-4 mb-4">
      <h2 className="text-[13px] font-bold mb-1">نسخ مواعيد أكتوبر → نوفمبر</h2>
      <p className="text-[11px] mb-3" style={{ color: '#6f7974' }}>
        ينسخ كل مواعيد شهر 10 إلى شهر 11 بنفس الطلاب والمعلمين والوقت والمدة والملاحظات.
        المواعيد الأسبوعية الثابتة تظهر تلقائيًا كل شهر.
      </p>
      <button
        type="button"
        disabled={pending}
        className="btn-primary w-full py-2.5 text-[13px]"
        onClick={() => {
          if (!confirm('نسخ مواعيد أكتوبر 2026 إلى نوفمبر 2026؟')) return
          setMsg('')
          start(async () => {
            const fd = new FormData()
            fd.set('from_month', '2026-10')
            fd.set('to_month', '2026-11')
            const r = await copyScheduleMonth(fd)
            if (r?.error) setMsg('فشل: ' + r.error)
            else setMsg(r?.message || 'تم النسخ ✓')
          })
        }}
      >
        {pending ? 'جاري النسخ...' : 'نسخ جدول أكتوبر لنوفمبر'}
      </button>
      {msg && (
        <p className="text-[12px] mt-2 font-semibold" style={{ color: msg.startsWith('فشل') ? '#ba1a1a' : '#176b52' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
