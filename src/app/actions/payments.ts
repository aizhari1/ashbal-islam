'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { applyPayment } from '@/lib/payments-core'
import { uploadPaymentReceipt } from '@/lib/payment-receipt'

export async function recordPayment(formData: FormData) {
  const supabase = await createClient()

  const forceClear = formData.get('clear_due') === '1' || formData.get('clear_due') === 'true'
  const studentId = String(formData.get('student_id') || '')
  const file = formData.get('receipt')
  const receiptFile = file instanceof File && file.size > 0 ? file : null

  // الإيصال اختياري — لو فشل الرفع منكمّل الدفع بدون صورة
  let receiptUrl: string | null = null
  if (receiptFile && studentId) {
    const up = await uploadPaymentReceipt(supabase, receiptFile, studentId)
    if (up.url) receiptUrl = up.url
    // لا نوقف الدفع لو فشل الرفع
  }

  const res = await applyPayment(supabase, {
    student_id: studentId,
    amount: Number(formData.get('amount') || 0),
    currency: String(formData.get('currency') || 'EGP'),
    method: String(formData.get('method') || formData.get('payment_method') || 'تحويل'),
    notes: String(formData.get('notes') || formData.get('note') || '') || null,
    payment_date: String(formData.get('payment_date') || '') || null,
    clear_due: forceClear,
    idempotency_key: String(formData.get('idempotency_key') || '') || null,
    receipt_url: receiptUrl,
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
