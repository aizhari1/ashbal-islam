'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeMethod } from '@/lib/payment-methods'
import { applyPayment, requireFinanceRole } from '@/lib/payments-core'
import { uploadPaymentReceipt } from '@/lib/payment-receipt'
import { serviceClient } from '@/lib/supabase/service'
import { computePrepaidUntil } from '@/lib/prepaid'

function revalidatePayments() {
  for (const p of [
    '/admin/payments',
    '/admin/finance',
    '/admin/subscriptions-log',
    '/admin',
    '/admin/monthly',
    '/supervisor',
    '/supervisor/payment',
  ]) {
    revalidatePath(p)
  }
}

export async function recordPayment(formData: FormData) {
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
    source: 'admin',
  })
  if (!res.success) return { error: res.error }

  revalidatePayments()
  return { ok: true, prepaid_until: res.prepaid_until }
}

export async function updatePaymentMethod(formData: FormData) {
  const supabase = await createClient()
  const auth = await requireFinanceRole(supabase)
  if (!auth.ok) return { error: auth.error }

  const id = String(formData.get('id') || '')
  const method = normalizeMethod(String(formData.get('method') || ''))
  if (!id) return { error: 'معرف ناقص' }

  const sb = serviceClient()
  const { error } = await sb.from('payments').update({ method }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePayments()
  return { ok: true }
}

/** تعديل مبلغ / تاريخ / طريقة / ملاحظات */
export async function updatePayment(formData: FormData) {
  try {
    const supabase = await createClient()
    const auth = await requireFinanceRole(supabase)
    if (!auth.ok) return { error: auth.error }

    const id = String(formData.get('id') || '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'معرف غير صالح' }

    const newAmount = Math.max(0, Number(formData.get('amount') || 0))
    const newDate = String(formData.get('payment_date') || '').slice(0, 10)
    const newMethod = normalizeMethod(String(formData.get('method') || ''))
    const newNotes = String(formData.get('notes') || '').trim() || null

    if (newAmount <= 0) return { error: 'المبلغ لازم يكون أكبر من صفر' }

    const sb = serviceClient()
    const { data: before, error: fetchErr } = await sb
      .from('payments')
      .select('id, student_id, amount, payment_date, method, notes')
      .eq('id', id)
      .maybeSingle()
    if (fetchErr) return { error: fetchErr.message }
    if (!before) return { error: 'الدفعة غير موجودة' }

    const oldAmount = Number(before.amount || 0)
    const delta = newAmount - oldAmount

    const patch: Record<string, unknown> = {
      amount: newAmount,
      method: newMethod || before.method,
      notes: newNotes,
    }
    if (newDate) patch.payment_date = newDate

    const { error: upErr } = await sb.from('payments').update(patch).eq('id', id)
    if (upErr) return { error: upErr.message }

    if (delta !== 0 && before.student_id) {
      const { data: st } = await sb
        .from('students')
        .select('amount_due')
        .eq('id', before.student_id)
        .maybeSingle()
      const currentDue = Number(st?.amount_due || 0)
      const nextDue = Math.max(0, currentDue - delta)
      await sb.from('students').update({ amount_due: nextDue }).eq('id', before.student_id)
    }

    await sb.from('activity_log').insert({
      actor_id: auth.userId,
      action: 'update_payment',
      entity_type: 'payment',
      entity_id: id,
      details: {
        student_id: before.student_id,
        old_amount: oldAmount,
        new_amount: newAmount,
        old_date: before.payment_date,
        new_date: newDate || before.payment_date,
        method: newMethod,
      },
    })

    revalidatePayments()
    return { ok: true, message: 'تم تعديل الدفعة' }
  } catch (e: any) {
    return { error: e?.message || 'فشل التعديل' }
  }
}

/** حذف دفعة بالخطأ مع إرجاع المستحق */
export async function deletePayment(formData: FormData) {
  try {
    const supabase = await createClient()
    const auth = await requireFinanceRole(supabase)
    if (!auth.ok) return { error: auth.error }

    const id = String(formData.get('id') || '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'معرف غير صالح' }

    const sb = serviceClient()
    const { data: pay, error: fetchErr } = await sb
      .from('payments')
      .select('id, student_id, amount, payment_date, method, notes, due_before, due_after, prepaid_months')
      .eq('id', id)
      .maybeSingle()
    if (fetchErr) return { error: fetchErr.message }
    if (!pay) return { error: 'الدفعة غير موجودة أو اتحذفت قبل كده' }

    const amount = Number(pay.amount || 0)
    const studentId = pay.student_id

    await sb.from('activity_log').insert({
      actor_id: auth.userId,
      action: 'delete_payment',
      entity_type: 'payment',
      entity_id: id,
      details: {
        student_id: studentId,
        amount,
        method: pay.method,
        payment_date: pay.payment_date,
        notes: pay.notes,
        due_before: pay.due_before,
        due_after: pay.due_after,
        prepaid_months: pay.prepaid_months,
      },
    })

    const { error: delErr } = await sb.from('payments').delete().eq('id', id)
    if (delErr) return { error: `فشل الحذف: ${delErr.message}` }

    if (studentId) {
      const { data: st } = await sb
        .from('students')
        .select('amount_due')
        .eq('id', studentId)
        .maybeSingle()

      const currentDue = Number(st?.amount_due || 0)
      let restoredDue = currentDue + amount
      if (pay.due_before != null && Number(pay.due_after) === 0) {
        restoredDue = Math.max(restoredDue, Number(pay.due_before) || 0)
      }

      const { data: remaining } = await sb
        .from('payments')
        .select('payment_date, prepaid_months, notes')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: true })
        .order('id', { ascending: true })
        .limit(1000)

      let prepaidUntil: string | null = null
      for (const r of remaining || []) {
        let months = Number(r.prepaid_months || 0)
        if (months <= 0 && String(r.notes || '').includes('دفع مقدم')) {
          const m = String(r.notes).match(/(\d+)\s*شهر/)
          months = m ? Number(m[1]) : 0
        }
        if (months > 0 && r.payment_date) {
          // بالترتيب الزمني ونمدّد التغطية الموجودة (زي ما applyPayment بيعمل) بدل ما كل دفعة تتحسب لوحدها
          const until = computePrepaidUntil(String(r.payment_date).slice(0, 10), months, prepaidUntil)
          if (!prepaidUntil || until > prepaidUntil) prepaidUntil = until
        }
      }

      await sb
        .from('students')
        .update({
          amount_due: restoredDue,
          prepaid_until: prepaidUntil,
        })
        .eq('id', studentId)
    }

    revalidatePayments()
    return { ok: true, message: 'اتحذفت الدفعة ورجع المستحق' }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}
