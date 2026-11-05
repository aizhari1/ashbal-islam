'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMySession, updateSessionReport } from '@/app/actions/attendance'
import { waLink } from '@/lib/whatsapp'

export default function SessionActions({ id, notes, phone }: { id: string; notes: string; phone: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(notes)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const hasReport = !!notes.trim()

  return (
    <div className="mt-2 border-t border-[#e5efe8] pt-2">
      <div className="flex flex-wrap gap-3 text-[12px] font-bold">
        {hasReport && (
          <>
            <button type="button" style={{ color: '#176b52' }} onClick={() => { navigator.clipboard?.writeText(notes); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
              {copied ? '✓ تم النسخ' : 'نسخ التقرير'}
            </button>
            <a href={waLink(phone, notes)} target="_blank" rel="noopener" style={{ color: '#128c4a' }}>واتساب</a>
          </>
        )}
        <button type="button" style={{ color: '#755b1b' }} onClick={() => setEditing(!editing)}>{editing ? 'إلغاء التعديل' : 'تعديل التقرير'}</button>
        <button type="button" disabled={pending} style={{ color: '#93000a' }} onClick={() => {
          if (!confirm('حذف الحصة؟ هيتحذف تقريرها معاها ويرجع رقم الحصة.')) return
          start(async () => { const r: any = await deleteMySession(id); if (r?.error) setMsg(r.error); else router.refresh() })
        }}>حذف</button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2">
          <textarea className="input min-h-[160px] text-[12px] leading-relaxed" dir="rtl" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" disabled={pending} className="btn-primary w-full py-2" onClick={() => start(async () => {
            const r: any = await updateSessionReport(id, text)
            if (r?.error) setMsg(r.error); else { setMsg('تم حفظ التعديل ✓'); setEditing(false); router.refresh() }
          })}>{pending ? '...' : 'حفظ التعديل'}</button>
        </div>
      )}
      {msg && <p className="text-[11px] mt-1" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>{msg}</p>}
    </div>
  )
}
