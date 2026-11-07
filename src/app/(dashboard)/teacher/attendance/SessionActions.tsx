'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteMySession, updateMySession } from '@/app/actions/attendance'
import { waLink } from '@/lib/whatsapp'

export default function SessionActions({
  id,
  notes,
  phone,
  studentName,
  status: initialStatus,
  sessionNum: initialNum,
  sessionDuration: initialDur,
}: {
  id: string
  notes: string
  phone: string | null
  studentName?: string
  status?: string
  sessionNum?: number | null
  sessionDuration?: number | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(notes)
  const [status, setStatus] = useState(initialStatus || 'حاضر')
  const [sessionNum, setSessionNum] = useState(String(initialNum ?? ''))
  const [duration, setDuration] = useState(String(initialDur ?? ''))
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
          {editing ? 'إلغاء' : 'تعديل الحصة'}
        </button>
        <button
          type="button"
          disabled={pending}
          style={{ color: '#93000a' }}
          onClick={() => {
            if (!confirm('حذف الحصة نهائيًا؟ التقرير يتحفظ في السجل وعدّاد الطالب يتظبط.'))
              return
            start(async () => {
              const r: any = await deleteMySession(id)
              if (r?.error) setMsg(r.error)
              else {
                setMsg(r?.message || 'تم الحذف ✓')
                router.refresh()
              }
            })
          }}
        >
          {pending ? '...' : 'حذف'}
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2 rounded-xl p-3" style={{ background: '#f4faf7' }}>
          <p className="text-[11px] font-bold" style={{ color: '#00513c' }}>
            تعديل بيانات الحصة
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold block mb-0.5">الحالة</label>
              <select
                className="input text-[12px] py-1.5"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="حاضر">حاضر</option>
                <option value="متأخر">متأخر</option>
                <option value="غائب">غائب</option>
                <option value="معذور">معذور</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-0.5">رقم الحصة</label>
              <input
                className="input text-[12px] py-1.5"
                type="number"
                min={0}
                value={sessionNum}
                onChange={(e) => setSessionNum(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold block mb-0.5">المدة (د)</label>
              <input
                className="input text-[12px] py-1.5"
                type="number"
                min={5}
                max={300}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>
          <label className="text-[10px] font-bold block">نص التقرير</label>
          <textarea
            className="input min-h-[140px] text-[12px] leading-relaxed"
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
                const r: any = await updateMySession(id, {
                  status,
                  session_num: sessionNum === '' ? null : Number(sessionNum),
                  session_duration: duration === '' ? null : Number(duration),
                  notes: text,
                })
                if (r?.error) setMsg(r.error)
                else {
                  setMsg(r?.message || 'تم الحفظ ✓')
                  setEditing(false)
                  router.refresh()
                }
              })
            }
          >
            {pending ? 'جاري الحفظ...' : 'حفظ تعديل الحصة'}
          </button>
        </div>
      )}
      {msg && (
        <p className="text-[11px] mt-1" style={{ color: msg.includes('✓') || msg.includes('تم') ? '#176b52' : '#93000a' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
