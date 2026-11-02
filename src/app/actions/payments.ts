'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dueAfterPayment } from '@/lib/dues'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const student_id = String(formData.get('student_id') || '')
  const amount = Number(formData.get('amount') || 0)
  if (!student_id || amount <= 0) return { error: 'بيانات غير صالحة' }

  const currency = String(formData.get('currency') || 'EGP')
  const method = String(formData.get('method') || formData.get('payment_method') || 'تحويل')
  const notes = String(formData.get('notes') || formData.get('note') || '')
  const payment_date = String(formData.get('payment_date') || new Date().toISOString().slice(0, 10))
  // clear_due=1 يصفّر المستحق كامل؛ غير كده ينقص بالمبلغ فقط
  const forceClear = formData.get('clear_due') === '1' || formData.get('clear_due') === 'true'

  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id,
      amount,
      currency,
      status: 'مدفوع',
      payment_date,
      method,
      notes,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  const { data: st } = await supabase.from('students').select('amount_due').eq('id', student_id).single()
  const prev = Number(st?.amount_due || 0)
  const next = forceClear ? 0 : dueAfterPayment(prev, amount)
  await supabase.from('students').update({ amount_due: next }).eq('id', student_id)

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'record_payment',
    entity_type: 'payment',
    entity_id: data.id,
    details: { student_id, amount, currency, prev_due: prev, new_due: next },
  })

  revalidatePath('/admin/finance')
  revalidatePath('/admin/students')
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
  revalidatePath('/supervisor')
  revalidatePath('/supervisor/payment')
  revalidatePath('/admin/monthly')
  return { success: true, data, new_due: next }
}
