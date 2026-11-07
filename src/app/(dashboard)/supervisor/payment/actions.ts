'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { applyPayment } from '@/lib/payments-core'
import { uploadPaymentReceipt } from '@/lib/payment-receipt'

export async function supervisorRecordPayment(formData: FormData) {
  const supabase = await createClient()

  const studentId = String(formData.get('student_id') || '')
  const file = formData.get('receipt')
  const receiptFile = file instanceof File && file.size > 0 ? file : null
  const prepaidMonths = Number(formData.get('prepaid_months') || 0)

  let receiptUrl: string | null = null
  if (receiptFile && studentId) {
    const up = await uploadPaymentReceipt(supabase, receiptFile, studentId)
    if (up.url) receiptUrl = up.url
  }

  const res = await applyPayment(supabase, {
    student_id: studentId,
    amount: Number(formData.get('amount') || 0),
    currency: 'EGP',
    method: String(formData.get('method') || ''),
    notes: String(formData.get('notes') || '') || null,
    payment_date: String(formData.get('payment_date') || '') || null,
    idempotency_key: String(formData.get('idempotency_key') || '') || null,
    receipt_url: receiptUrl,
    prepaid_months: prepaidMonths,
    source: 'supervisor',
  })
  if (!res.success) return { error: res.error }

  revalidatePath('/supervisor/payment')
  revalidatePath('/supervisor')
  revalidatePath('/admin')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/payments')
  revalidatePath('/admin/monthly')
  return { ok: true, prepaid_until: res.prepaid_until }
}
