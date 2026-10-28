'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const student_id = String(formData.get('student_id') || '')
  const amount = Number(formData.get('amount') || 0)
  if (!student_id || amount <= 0) return { error: 'بيانات غير صالحة' }

  const currency = String(formData.get('currency') || 'EGP')
  const method = String(formData.get('method') || formData.get('payment_method') || 'تحويل')
  const notes = String(formData.get('notes') || formData.get('note') || '')
  const payment_date = String(formData.get('payment_date') || new Date().toISOString().slice(0, 10))
  const clearDue = formData.get('clear_due') !== '0'

  const { data, error } = await supabase.from('payments').insert({
    student_id,
    amount,
    currency,
    status: 'مدفوع',
    payment_date,
    method,
    notes,
  }).select().single()

  if (error) return { error: error.message }

  if (clearDue) {
    await supabase.from('students').update({ amount_due: 0 }).eq('id', student_id)
  } else {
    const { data: st } = await supabase.from('students').select('amount_due').eq('id', student_id).single()
    if (st) {
      const newDue = Math.max(0, Number(st.amount_due || 0) - amount)
      await supabase.from('students').update({ amount_due: newDue }).eq('id', student_id)
    }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'record_payment',
    entity_type: 'payment',
    entity_id: data.id,
    details: { student_id, amount, currency, clear_due: clearDue },
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/students')
  revalidatePath('/supervisor')
  return { success: true, data }
}
