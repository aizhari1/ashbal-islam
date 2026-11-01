'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeMethod } from '@/lib/payment-methods'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const amount = Number(formData.get('amount') || 0)
  const method = normalizeMethod(String(formData.get('method') || ''))
  const paymentDate = String(formData.get('payment_date') || new Date().toISOString().slice(0, 10))
  const notes = String(formData.get('notes') || '')

  if (!studentId || amount <= 0) return { error: 'بيانات ناقصة' }

  const { error } = await supabase.from('payments').insert({
    student_id: studentId,
    amount,
    currency: 'EGP',
    status: 'مدفوع',
    payment_date: paymentDate,
    method,
    notes: notes || null,
  })
  if (error) return { error: error.message }

  // تقليل المستحق
  const { data: st } = await supabase.from('students').select('amount_due').eq('id', studentId).single()
  if (st) {
    const next = Math.max(0, Number(st.amount_due || 0) - amount)
    await supabase.from('students').update({ amount_due: next }).eq('id', studentId)
  }

  revalidatePath('/admin/payments')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/subscriptions-log')
  return { ok: true }
}

export async function updatePaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const id = String(formData.get('id') || '')
  const method = normalizeMethod(String(formData.get('method') || ''))
  if (!id) return { error: 'معرف ناقص' }

  const { error } = await supabase.from('payments').update({ method }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/payments')
  return { ok: true }
}
