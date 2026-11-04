'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitTrialReport } from '@/app/actions/trials'

export default function TrialReportForm({ studentId, name }: { studentId: string; name: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [attendance, setAttendance] = useState('حضر')
  const [interaction, setInteraction] = useState('جيد')
  const [level, setLevel] = useState('')
  const [suitability, setSuitability] = useState('')
  const [rec, setRec] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(true)
  const [pending, start] = useTransition()

  if (!open) return (
    <button onClick={() => setOpen(true)} className="btn-primary w-full py-2.5 text-[13px]">كتابة تقرير التجربة</button>
  )

  return (
    <div className="space-y-2 mt-2">
      <p className="text-[12px] font-bold">تقرير الحصة التجريبية — {name}</p>
      <label className="text-[12px] font-bold block">الحضور</label>
      <select className="input" value={attendance} onChange={(e) => setAttendance(e.target.value)}>
        <option value="حضر">حضر</option><option value="غاب">غاب</option>
      </select>
      <label className="text-[12px] font-bold block">التفاعل</label>
      <select className="input" value={interaction} onChange={(e) => setInteraction(e.target.value)}>
        <option>ممتاز</option><option>جيد</option><option>ضعيف</option>
      </select>
      <label className="text-[12px] font-bold block">مستوى الطالب</label>
      <input className="input" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="مثال: مبتدئ / يقرأ بطلاقة" />
      <label className="text-[12px] font-bold block">مدى الملاءمة للحلقة</label>
      <input className="input" value={suitability} onChange={(e) => setSuitability(e.target.value)} placeholder="مناسب / يحتاج متابعة" />
      <label className="text-[12px] font-bold block">نتيجة الاشتراك</label>
      <select className="input" value={rec} onChange={(e) => setRec(e.target.value)}>
        <option value="">لسه منتظر قراره</option><option value="اشترك">اشترك</option><option value="لم يشترك">لم يشترك</option>
      </select>
      <label className="text-[12px] font-bold block">ملاحظات</label>
      <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button disabled={pending} className="btn-primary w-full py-2.5" onClick={() => start(async () => {
        const r: any = await submitTrialReport(studentId, { attendance, interaction, level, suitability, recommendation: rec, notes })
        setOk(!!r?.success); setMsg(r?.message || '')
        if (r?.success) setTimeout(() => router.refresh(), 900)
      })}>{pending ? 'جاري الحفظ...' : 'حفظ التقرير'}</button>
      {msg && <p className="text-[12px] text-center" style={{ color: ok ? '#176b52' : '#93000a' }}>{msg}</p>}
    </div>
  )
}
