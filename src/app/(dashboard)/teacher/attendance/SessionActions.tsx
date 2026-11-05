'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMySession, updateSessionReport } from '@/app/actions/attendance'
import { waLink } from '@/lib/whatsapp'

export default function SessionActions({
  id,
  notes,
  phone,
  studentName,
}: {
  id: string
  notes: string
  phone: string | null
  studentName?: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(notes)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const report = (text || notes || '').trim()
  const hasReport = !!report

  function copyReport() {
    if (!report) {
      setMsg('مفيش تقرير للنسخ')
      return
    }
    navigator.clipboard?.writeText(report).then(
      () => {
        setCopied(true)
        setMsg('تم نسخ التقرير ✓')
        setTimeout(() => setCopied(false), 2000)
      },
      () => setMsg('تعذّر النسخ — انسخ يدويًا من التعديل')
    )
  }

  function openWhatsApp() {
    if (!report) {
      setMsg('مفيش تقرير للإرسال')
      return
    }
    window.open(waLink(phone, report), '_blank', 'noopener')
  }

  return (
    <div className="mt-2 border-t border-[#e5efe8] pt-2">
      {hasReport && !editing && (
        <pre
          className="text-[11px] leading-relaxed whitespace-pre-wrap mb-2 max-h-28 overflow-y-auto rounded-lg p-2"
          style={{ background: '#f4faf7', color: '#1a1c1b' }}
          dir="rtl"
        >
          {report}
        </pre>
      )}

      {/* أزرار دائمة: نسخ + واتساب أي وقت */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={copyReport}
          disabled={!hasReport}
          className="py-2 rounded-xl text-[12px] font-bold disabled:opacity-40"
          style={{ background: '#e8f7f0', color: '#176b52' }}
        >
          {copied ? '✓ تم النسخ' : 'نسخ التقرير'}
        </button>
        <button
          type="button"
          onClick={openWhatsApp}
          disabled={!hasReport}
          className="py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40"
          style={{ background: '#25D366' }}
        >
          واتساب
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-[12px] font-bold">
        <button type="button" style={{ color: '#755b1b' }} onClick={() => setEditing(!editing)}>
          {editing ? 'إلغاء التعديل' : hasReport ? 'تعديل التقرير' : 'كتابة تقرير'}
        </button>
        <button
          type="button"
          disabled={pending}
          style={{ color: '#93000a' }}
          onClick={() => {
            if (!confirm('حذف الحصة؟ هيتحذف تقريرها معاها ويرجع رقم الحصة.'))
              return
            start(async () => {
              const r: any = await deleteMySession(id)
              if (r?.error) setMsg(r.error)
              else router.refresh()
            })
          }}
        >
          حذف
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2">
          <textarea
            className="input min-h-[160px] text-[12px] leading-relaxed"
            dir="rtl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={studentName ? `تقرير حصة ${studentName}...` : 'نص التقرير...'}
          />
          <button
            type="button"
            disabled={pending}
            className="btn-primary w-full py-2"
            onClick={() =>
              start(async () => {
                const r: any = await updateSessionReport(id, text)
                if (r?.error) setMsg(r.error)
                else {
                  setMsg('تم حفظ التعديل ✓')
                  setEditing(false)
                  router.refresh()
                }
              })
            }
          >
            {pending ? '...' : 'حفظ التعديل'}
          </button>
        </div>
      )}
      {msg && (
        <p className="text-[11px] mt-1" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
