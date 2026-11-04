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
  source: PaymentSource
}

export async function applyPayment(supabase: SupabaseClient, input: ApplyPaymentInput): Promise<PaymentResult> {
  const auth = await requireFinanceRole(supabase)
  if (!auth.ok) return { success: false, error: auth.error }
  const source: PaymentSource = auth.role === 'supervisor' ? 'supervisor' : input.source

  const amount = Number(input.amount)
  if (!UUID.test(input.student_id || '') || !Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: 'بيانات غير صالحة' }
  }
  const currency = input.currency || 'EGP'
  const method = normalizeMethod(input.method || '')
  const notes = input.notes || null
  const paymentDate = (input.payment_date || todayKey()).slice(0, 10)
  const clearDue = !!input.clear_due
  const idem = (input.idempotency_key || '').trim() || null

  // محاولة RPC الذرّي إن وُجدت migration 004
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
        return {
          success: true,
          payment_id: String(row.payment_id || row.id || ''),
          prev_due: Number(row.prev_due ?? row.due_before ?? 0),
          new_due: Number(row.new_due ?? row.due_after ?? 0),
          duplicate: !!row.duplicate,
        }
      }
    } catch {
      /* fallback legacy */
    }
  }

  return legacyApply(supabase, { ...input, source }, { amount, currency, method, notes, paymentDate, clearDue }, auth.userId)
}

async function legacyApply(
  supabase: SupabaseClient,
  input: ApplyPaymentInput,
  v: { amount: number; currency: string; method: string; notes: string | null; paymentDate: string; clearDue: boolean },
  actorId: string
): Promise<PaymentResult> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { data: recent } = await supabase
    .from('payments')
    .select('id')
    .eq('student_id', input.student_id)
    .eq('amount', v.amount)
    .eq('payment_date', v.paymentDate)
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
  const next = v.clearDue ? 0 : dueAfterPayment(prev, v.amount)

  const { data: pay, error } = await supabase
    .from('payments')
    .insert({
      student_id: input.student_id,
      amount: v.amount,
      currency: v.currency,
      status: 'مدفوع',
      payment_date: v.paymentDate,
      method: v.method,
      notes: v.notes,
    })
    .select('id')
    .single()
  if (error || !pay) return { success: false, error: error?.message || 'تعذّر تسجيل الدفعة' }

  const { error: upErr } = await supabase.from('students').update({ amount_due: next }).eq('id', input.student_id)
  if (upErr) return { success: false, error: `سُجّلت الدفعة لكن تعذّر تحديث الرصيد: ${upErr.message}` }

  await supabase.from('activity_log').insert({
    actor_id: actorId,
    action: input.source === 'supervisor' ? 'supervisor_payment' : 'record_payment',
    entity_type: 'payment',
    entity_id: pay.id,
    details: {
      student_id: input.student_id,
      amount: v.amount,
      method: v.method,
      payment_date: v.paymentDate,
      prev_due: prev,
      new_due: next,
    },
  })

  return { success: true, payment_id: pay.id, prev_due: prev, new_due: next, duplicate: false }
}
