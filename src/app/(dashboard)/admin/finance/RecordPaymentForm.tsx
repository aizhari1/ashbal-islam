'use client'

import { useState, useTransition } from 'react'
import { recordPayment } from '@/app/actions/payments'

export function RecordPaymentForm({
  students,
}: {
  students: { id: string; code: string; name: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg('')
    setErr('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await recordPayment(fd)
      if (res.error) setErr(res.error)
      else {
        setMsg('تم تسجيل الدفعة')
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <select name="student_id" required className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]">
        <option value="">— اختر الطالب —</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" type="number" step="0.01" required placeholder="المبلغ"
          className="bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]" />
        <select name="currency" defaultValue="EGP" className="bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]">
          <option value="EGP">ج.م</option>
          <option value="SAR">ر.س</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <select name="method" className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]">
        <option value="تحويل">تحويل</option>
        <option value="InstaPay">InstaPay</option>
        <option value="فوري">فوري</option>
        <option value="فودافون كاش">فودافون كاش</option>
        <option value="نقدي">نقدي</option>
      </select>
      <input name="notes" placeholder="ملاحظة" className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]" />
      {err && <p className="text-[13px] text-[#ba1a1a]">{err}</p>}
      {msg && <p className="text-[13px] text-[#176b52] font-medium">{msg}</p>}
      <button type="submit" disabled={isPending}
        className="w-full bg-[#176b52] text-white py-3 rounded-xl font-bold disabled:opacity-50">
        {isPending ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
      </button>
    </form>
  )
}
