'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePayment, updatePayment, updatePaymentMethod } from './actions'
import { PAYMENT_METHODS, methodLabel, methodColor, normalizeMethod } from '@/lib/payment-methods'

type Pay = {
  id: string
  amount: number
  payment_date: string
  method: string | null
  notes: string | null
  students?: { name?: string; code?: string } | null
}

export function PaymentRowActions({ payment }: { payment: Pay }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  const amount = Number(payment.amount || 0)
  const date = String(payment.payment_date || '').slice(0, 10)

  function onDelete() {
    if (
      !confirm(
        `حذف دفعة ${amount} ج للطالب ${payment.students?.name || ''}؟\nهيتشال التسجيل ويرجع المبلغ للمستحق.`
      )
    )
      return
    start(async () => {
      const fd = new FormData()
      fd.set('id', payment.id)
      const r = await deletePayment(fd)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'اتحذفت')
        router.refresh()
      }
    })
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', payment.id)
    start(async () => {
      const r = await updatePayment(fd)
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || 'تم التعديل')
        setEditing(false)
        router.refresh()
      }
    })
  }

  function onMethod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('id', payment.id)
    start(async () => {
      const r = await updatePaymentMethod(fd)
      if (r?.error) setMsg(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="mt-2 space-y-2">
      {msg && (
        <p className="text-[11px] font-bold text-center" style={{ color: msg.includes('فشل') ? '#ba1a1a' : '#176b52' }}>
          {msg}
        </p>
      )}

      {!editing && (
        <>
          <form onSubmit={onMethod} className="flex gap-2 items-center">
            <select
              name="method"
              defaultValue={normalizeMethod(payment.method)}
              className="flex-1 rounded-lg border px-2 py-1.5 text-[11px] bg-white"
              style={{ borderColor: '#cde8dc' }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pending}
              className="text-[11px] font-bold px-2 py-1.5 rounded-lg"
              style={{ background: '#e8f7f0', color: '#176b52' }}
            >
              طريقة
            </button>
          </form>

          <div className="flex gap-3">
            <button
              type="button"
              className="text-[12px] font-bold"
              style={{ color: '#755b1b' }}
              onClick={() => setEditing(true)}
            >
              تعديل الدفعة
            </button>
            <button
              type="button"
              disabled={pending}
              className="text-[12px] font-bold"
              style={{ color: '#ba1a1a' }}
              onClick={onDelete}
            >
              حذف الدفعة
            </button>
          </div>
        </>
      )}

      {editing && (
        <form onSubmit={onSave} className="rounded-xl p-2 space-y-2" style={{ background: '#f4faf7' }}>
          <p className="text-[11px] font-bold" style={{ color: '#00513c' }}>
            تعديل الدفعة
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              defaultValue={amount}
              className="rounded-lg border px-2 py-1.5 text-[12px]"
              style={{ borderColor: '#cde8dc' }}
              placeholder="المبلغ"
            />
            <input
              name="payment_date"
              type="date"
              defaultValue={date}
              className="rounded-lg border px-2 py-1.5 text-[12px]"
              style={{ borderColor: '#cde8dc' }}
            />
          </div>
          <select
            name="method"
            defaultValue={normalizeMethod(payment.method)}
            className="w-full rounded-lg border px-2 py-1.5 text-[12px] bg-white"
            style={{ borderColor: '#cde8dc' }}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            name="notes"
            defaultValue={payment.notes || ''}
            placeholder="ملاحظات"
            className="w-full rounded-lg border px-2 py-1.5 text-[12px]"
            style={{ borderColor: '#cde8dc' }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2 rounded-xl text-white text-[12px] font-bold"
              style={{ background: '#176b52' }}
            >
              {pending ? '...' : 'حفظ التعديل'}
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-[12px] font-bold"
              style={{ background: '#eee', color: '#333' }}
              onClick={() => setEditing(false)}
            >
              إلغاء
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// silence unused import warnings in some bundlers
void methodLabel
void methodColor
