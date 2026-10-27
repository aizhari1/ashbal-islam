'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function CashboxForm() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('رواتب')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) { setMsg('أدخل مبلغاً صحيحاً'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('activity_log').insert({
        actor_id: user?.id,
        action: 'finance_expense',
        entity_type: 'finance',
        details: { amount: amt, category, description, entry_type: 'مصروف' },
      })
      if (error) setMsg(error.message)
      else {
        setMsg('تم تسجيل المصروف')
        setAmount('')
        setDescription('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
        placeholder="المبلغ" className="w-full border rounded-xl px-3 py-2.5 text-[14px]" required />
      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className="w-full border rounded-xl px-3 py-2.5 text-[14px]">
        <option>رواتب</option>
        <option>رواتب إشراف</option>
        <option>إيجار</option>
        <option>مصاريف تشغيل</option>
        <option>أخرى</option>
      </select>
      <input value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="الوصف" className="w-full border rounded-xl px-3 py-2.5 text-[14px]" />
      {msg && <p className="text-[12px] text-[#0d9b8a]">{msg}</p>}
      <button type="submit" disabled={isPending}
        className="w-full bg-[#0d9b8a] text-white py-2.5 rounded-xl font-bold disabled:opacity-50">
        تسجيل المصروف
      </button>
    </form>
  )
}
