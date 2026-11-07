'use client'

import { useTransition, useState } from 'react'
import { setTeacherSessionRate, setTeacherAcademyRate, recordTeacherSettlement } from '@/app/actions/users'
import { useRouter } from 'next/navigation'

export function PayrollActions({
  teacherId,
  teacherName,
  sessionRate,
  academyRate,
  remaining,
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
  const [open, setOpen] = useState(true)
  const [amount, setAmount] = useState(String(remaining || ''))

  function saveRate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('teacher_id', teacherId)
    formData.set('teacher_name', teacherName)
    startTransition(async () => {
      const r = await setTeacherSessionRate(formData)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم تحديث سعر الحصة ✓')
        router.refresh()
      }
    })
  }

  function saveAcademy(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('teacher_id', teacherId)
    startTransition(async () => {
      const r = await setTeacherAcademyRate(formData)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم تحديث نسبة الأكاديمية ✓')
        router.refresh()
      }
    })
  }

  function settle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('teacher_name', teacherName)
    formData.set('amount', amount)
    startTransition(async () => {
      const r = await recordTeacherSettlement(formData)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم تسجيل التسوية ✓')
        setAmount('0')
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-[13px] font-bold px-3 py-2.5 rounded-xl text-white"
        style={{ background: '#176b52' }}
      >
        {open ? 'إخفاء التسوية / الصرف' : '💰 فتح تسوية / صرف للمعلم'}
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-xl p-3" style={{ background: '#f4faf7', border: '1px solid #cde8dc' }}>
          <form onSubmit={saveRate} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px] font-bold block mb-1">سعر الحصة الافتراضي</label>
              <input name="session_rate" type="number" defaultValue={sessionRate} className="input" required />
            </div>
            <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">
              حفظ
            </button>
          </form>
          <form onSubmit={saveAcademy} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[11px] font-bold block mb-1">نسبة الأكاديمية %</label>
              <input name="rate_percent" type="number" defaultValue={academyRate} className="input" required />
            </div>
            <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">
              حفظ
            </button>
          </form>
          <form onSubmit={settle} className="space-y-2">
            <label className="text-[11px] font-bold block">صرف للمعلم (المتبقي {remaining.toLocaleString('ar-EG')} ج)</label>
            <div className="flex gap-2 items-end">
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="المبلغ"
                className="input flex-1"
                required
              />
              <button
                type="submit"
                disabled={isPending || !amount || Number(amount) <= 0}
                className="px-4 py-2 text-[12px] font-bold rounded-xl text-white disabled:opacity-50"
                style={{ background: '#755b1b' }}
              >
                {isPending ? '...' : 'صرف'}
              </button>
            </div>
          </form>
          {msg && (
            <p className="text-[12px] font-bold" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
