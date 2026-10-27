'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function PaySupervisorForm({ supervisors }: { supervisors: string[] }) {
  const router = useRouter()
  const [name, setName] = useState(supervisors[0] || '')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = Number(amount)
    if (!name || !amt) return
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('activity_log').insert({
        actor_id: user?.id,
        action: 'supervisor_pay',
        entity_type: 'supervisor',
        details: { name, amount: amt, note },
      })
      await supabase.from('activity_log').insert({
        actor_id: user?.id,
        action: 'finance_expense',
        entity_type: 'finance',
        details: { amount: amt, category: 'رواتب إشراف', description: `راتب ${name}${note ? ' — ' + note : ''}` },
      })
      if (error) setMsg(error.message)
      else {
        setMsg('تم تسجيل الدفع')
        setAmount('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
      <h3 className="font-bold text-[14px]">تسجيل دفع لمشرف</h3>
      <select value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-[14px]">
        {supervisors.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="المبلغ"
        className="w-full border rounded-xl px-3 py-2.5 text-[14px]" required />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة"
        className="w-full border rounded-xl px-3 py-2.5 text-[14px]" />
      {msg && <p className="text-[12px] text-[#0d9b8a]">{msg}</p>}
      <button type="submit" disabled={isPending} className="w-full bg-[#0f5c4c] text-white py-2.5 rounded-xl font-bold">
        تسجيل الدفع
      </button>
    </form>
  )
}
