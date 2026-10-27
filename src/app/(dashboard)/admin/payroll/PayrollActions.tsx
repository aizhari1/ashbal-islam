'use client'

import { useTransition, useState } from 'react'
import { setTeacherSessionRate, setTeacherAcademyRate, recordTeacherSettlement } from '@/app/actions/users'
import { useRouter } from 'next/navigation'

export function PayrollActions({
  teacherId, teacherName, sessionRate, academyRate, remaining,
}: {
  teacherId: string
  teacherName: string
  sessionRate: number
  academyRate: number
  remaining: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)

  function saveRate(formData: FormData) {
    startTransition(async () => {
      formData.set('teacher_id', teacherId)
      formData.set('teacher_name', teacherName)
      const r = await setTeacherSessionRate(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم تحديث سعر الحصة'); router.refresh() }
    })
  }

  function saveAcademy(formData: FormData) {
    startTransition(async () => {
      formData.set('teacher_id', teacherId)
      const r = await setTeacherAcademyRate(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم تحديث نسبة الأكاديمية'); router.refresh() }
    })
  }

  function settle(formData: FormData) {
    startTransition(async () => {
      formData.set('teacher_name', teacherName)
      const r = await recordTeacherSettlement(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم تسجيل التسوية'); router.refresh() }
    })
  }

  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-semibold" style={{ color: '#176b52' }}>
        {open ? 'إخفاء الضبط' : 'ضبط السعر / تسوية'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: 'rgba(18,61,50,0.08)' }}>
          <form action={saveRate} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px]">سعر الحصة</label>
              <input name="session_rate" type="number" defaultValue={sessionRate} className="input" required />
            </div>
            <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">حفظ</button>
          </form>
          <form action={saveAcademy} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px]">نسبة الأكاديمية %</label>
              <input name="rate_percent" type="number" defaultValue={academyRate} className="input" required />
            </div>
            <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">حفظ</button>
          </form>
          <form action={settle} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px]">صرف (المتبقي {remaining})</label>
              <input name="amount" type="number" defaultValue={remaining || ''} placeholder="المبلغ" className="input" required />
            </div>
            <button type="submit" disabled={isPending} className="btn-gold px-3 py-2 text-[12px]">صرف</button>
          </form>
          {msg && <p className="text-[11px]" style={{ color: '#176b52' }}>{msg}</p>}
        </div>
      )}
    </div>
  )
}
