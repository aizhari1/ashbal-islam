/**
 * تسجيل الدفعات — نقطة دخول واحدة لكل المسارات (الإدارة، التذكير المالي، الإشراف).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { dueAfterPayment, todayKey } from './dues'
import { normalizeMethod } from './payment-methods'

export type PaymentSource = 'admin' | 'supervisor'

export type PaymentResult =
  | { success: true; payment_id: string; prev_due: number; new_due: number; duplicate: boolean }
  | { success: false; error: string }

const ALLOWED_ROLES = ['admin', 'supervisor']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DUPLICATE_WINDOW_MS = 60_000

export async function requireFinanceRole(
  supabase: SupabaseClient
): Promise<{ ok: true; userId: string; role: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'غير مصرح' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '')
  if (!ALLOWED_ROLES.includes(role)) return { ok: false, error: 'غير مصرح بتسجيل الدفعات' }
  return { ok: true, userId: user.id, role }
}

export type ApplyPaymentInput = {
  student_id: string
  amount: number
  currency?: string
  method?: string | null
  notes?: string | null
  payment_date?: string | null
  clear_due?: boolean
  idempotency_key?: string | null
  receipt_url?: string | null
  source: PaymentSource
}

export async function applyPayment(supabase: SupabaseClient, input: ApplyPaymentInput): Promise<PaymentResult> {
  const auth = await requireFinanceRole(supabase)
  if (!auth.ok) return { success: false, error: auth.error }
  const source: PaymentSource = auth.role === 'supervisor' ? 'supervisor' : input.source
  const actorId = auth.userId

  const amount = Number(input.amount)
  if (!UUID.test(input.student_id || '') || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'بيانات غير صالحة' }
  }
  const currency = input.currency || 'EGP'
  const method = normalizeMethod(input.method || '')
  let notes = input.notes || null
  const receiptUrl = (input.receipt_url || '').trim() || null
  if (receiptUrl) {
    notes = notes ? `${notes}\nإيصال: ${receiptUrl}` : `إيصال: ${receiptUrl}`
  }
  const paymentDate = (input.payment_date || todayKey()).slice(0, 10)
  const clearDue = !!input.clear_due
  const idem = (input.idempotency_key || '').trim() || null

  if (idem) {
    try {
      const { data, error } = await supabase.rpc('record_payment', {
        p_student_id: input.student_id,
        p_amount: amount,
        p_currency: currency,
        p_method: method,
        p_notes: notes,
        p_payment_date: paymentDate,
        p_clear_due: clearDue,
        p_idempotency_key: idem,
        p_source: source,
      })
      if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data
        const paymentId = String(row.payment_id || row.id || '')
        if (receiptUrl && paymentId) {
          await supabase.from('payments').update({ receipt_url: receiptUrl }).eq('id', paymentId)
        }
        return {
          success: true,
          payment_id: paymentId,
          prev_due: Number(row.prev_due ?? row.due_before ?? 0),
          new_due: Number(row.new_due ?? row.due_after ?? 0),
          duplicate: !!row.duplicate,
        }
      }
    } catch {
      /* fallback */
    }
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { data: recent } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('amount', amount)
    .eq('payment_date', paymentDate)
    .gte('created_at', since)
    .limit(1)
  if (recent && recent.length > 0) {
    const { data: st } = await supabase.from('students').select('amount_due').eq('id', input.student_id).maybeSingle()
    const due = Number(st?.amount_due || 0)
    return { success: true, payment_id: recent[0].id, prev_due: due, new_due: due, duplicate: true }
  }

  const { data: before, error: stErr } = await supabase
    .from('students')
    .select('amount_due')
    .eq('id', input.student_id)
    .maybeSingle()
  if (stErr || !before) return { success: false, error: 'الطالب غير موجود' }
  const prev = Number(before.amount_due || 0)
  const next = clearDue ? 0 : dueAfterPayment(prev, amount)

  const insertRow: Record<string, unknown> = {
    student_id: input.student_id,
    amount,
    currency,
    status: 'مدفوع',
    payment_date: paymentDate,
    method,
    notes,
  }
  if (receiptUrl) insertRow.receipt_url = receiptUrl
  if (idem) insertRow.idempotency_key = idem
  insertRow.due_before = prev
  insertRow.due_after = next
  insertRow.recorded_by = actorId

  const { data: pay, error } = await supabase.from('payments').insert(insertRow).select('id').single()
  if (error || !pay) {
    // إعادة بدون أعمدة اختيارية لو فشلت (receipt_url غير موجود)
    if (error && receiptUrl) {
      delete insertRow.receipt_url
      const { data: pay2, error: err2 } = await supabase.from('payments').insert(insertRow).select('id').single()
      if (err2 || !pay2) return { success: false, error: err2?.message || error.message || 'تعذّر تسجيل الدفعة' }
      await finalize(supabase, actorId, source, pay2.id, input.student_id, amount, method, paymentDate, prev, next, receiptUrl)
      await supabase.from('students').update({ amount_due: next }).eq('id', input.student_id)
      return { success: true, payment_id: pay2.id, prev_due: prev, new_due: next, duplicate: false }
    }
    return { success: false, error: error?.message || 'تعذّر تسجيل الدفعة' }
  }

  const { error: upErr } = await supabase.from('students').update({ amount_due: next }).eq('id', input.student_id)
  if (upErr) return { success: false, error: `سُجّلت الدفعة لكن تعذّر تحديث الرصيد: ${upErr.message}` }

  await finalize(supabase, actorId, source, pay.id, input.student_id, amount, method, paymentDate, prev, next, receiptUrl)

  return { success: true, payment_id: pay.id, prev_due: prev, new_due: next, duplicate: false }
}

async function finalize(
  supabase: SupabaseClient,
  actorId: string,
  source: PaymentSource,
  paymentId: string,
  studentId: string,
  amount: number,
  method: string,
  paymentDate: string,
  prev: number,
  next: number,
  receiptUrl: string | null
) {
  await supabase.from('activity_log').insert({
    actor_id: actorId,
    action: source === 'supervisor' ? 'supervisor_payment' : 'record_payment',
    entity_type: 'payment',
    entity_id: paymentId,
    details: {
      student_id: studentId,
      amount,
      method,
      payment_date: paymentDate,
      prev_due: prev,
      new_due: next,
      receipt_url: receiptUrl,
    },
  })
}
