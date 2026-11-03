'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { applyPayment } from '@/lib/payments-core'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()

  const forceClear = formData.get('clear_due') === '1' || formData.get('clear_due') === 'true'

  const res = await applyPayment(supabase, {
    student_id: String(formData.get('student_id') || ''),
    amount: Number(formData.get('amount') || 0),
    currency: String(formData.get('currency') || 'EGP'),
    method: String(formData.get('method') || formData.get('payment_method') || 'تحويل'),
    notes: String(formData.get('notes') || formData.get('note') || '') || null,
    payment_date: String(formData.get('payment_date') || '') || null,
    clear_due: forceClear,
    idempotency_key: String(formData.get('idempotency_key') || '') || null,
    source: 'admin',
  })

  if (!res.success) return { error: res.error }

  revalidatePath('/admin/finance')
  revalidatePath('/admin/students')
  revalidatePath('/admin/payments')
  revalidatePath('/admin')
  revalidatePath('/supervisor')
  revalidatePath('/supervisor/payment')
  revalidatePath('/admin/monthly')
  revalidatePath('/admin/subscriptions-log')
  return {
    success: true,
    data: { id: res.payment_id },
    new_due: res.new_due,
    duplicate: res.duplicate,
  }
}
