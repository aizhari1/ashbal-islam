'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeMethod } from '@/lib/payment-methods'

export async function supervisorRecordPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const amount = Number(formData.get('amount') || 0)
  const method = normalizeMethod(String(formData.get('method') || ''))
  const paymentDate = String(formData.get('payment_date') || new Date().toISOString().slice(0, 10))
  const notes = String(formData.get('notes') || '') || null

  if (!studentId || amount <= 0) return { error: 'اختر طالب والمبلغ' }

  const { error } = await supabase.from('payments').insert({
    student_id: studentId,
    amount,
    currency: 'EGP',
    status: 'مدفوع',
    payment_date: paymentDate,
    method,
    notes,
  })
  if (error) return { error: error.message }

  const { data: st } = await supabase.from('students').select('amount_due').eq('id', studentId).single()
  if (st) {
    await supabase
      .from('students')
      .update({ amount_due: Math.max(0, Number(st.amount_due || 0) - amount) })
      .eq('id', studentId)
  }

  await supabase.from('activity_log').insert({
    action: 'supervisor_payment',
    entity_id: studentId,
    user_id: user.id,
    details: { amount, method, payment_date: paymentDate },
  })

  revalidatePath('/supervisor/payment')
  revalidatePath('/supervisor')
  revalidatePath('/admin/payments')
  return { ok: true }
}
