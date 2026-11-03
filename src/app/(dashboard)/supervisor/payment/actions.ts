'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { applyPayment } from '@/lib/payments-core'

export async function supervisorRecordPayment(formData: FormData) {
  const supabase = await createClient()

  const res = await applyPayment(supabase, {
    student_id: String(formData.get('student_id') || ''),
    amount: Number(formData.get('amount') || 0),
    currency: 'EGP',
    method: String(formData.get('method') || ''),
    notes: String(formData.get('notes') || '') || null,
    payment_date: String(formData.get('payment_date') || '') || null,
    idempotency_key: String(formData.get('idempotency_key') || '') || null,
    source: 'supervisor',
  })
  if (!res.success) return { error: res.error }

  revalidatePath('/supervisor/payment')
  revalidatePath('/supervisor')
  revalidatePath('/admin')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/payments')
  revalidatePath('/admin/monthly')
  return { ok: true }
}
