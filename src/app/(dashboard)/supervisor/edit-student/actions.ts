'use server'

import { requireStaff } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function revalidateAll() {
  for (const p of [
    '/supervisor/edit-student',
    '/admin/students',
    '/admin/session-settle',
    '/admin/income',
    '/admin/payroll',
    '/admin/finance',
    '/teacher/students',
    '/teacher/dues',
  ]) {
    revalidatePath(p)
  }
}

export async function loadStudentExtraCosts(studentId: string) {
  try {
    const sb = serviceClient()
    const { data } = await sb
      .from('activity_log')
      .select('details, created_at')
      .eq('entity_id', studentId)
      .eq('action', 'student_extra_costs')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const d = (data?.details || {}) as Record<string, unknown>
    return {
      ads_fee: Number(d.ads_fee) || 0,
      supervision_fee: Number(d.supervision_fee) || 0,
      other_fee: Number(d.other_fee) || 0,
    }
  } catch {
    return { ads_fee: 0, supervision_fee: 0, other_fee: 0 }
  }
}

export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const staff = await requireStaff()
  if (!staff.ok) return { error: staff.error }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  const sb = serviceClient()
  const { data: before } = await sb
    .from('students')
    .select(
      'id, name, code, last_session_num, amount_due, teacher_id, session_duration, price_per_session, monthly_sessions, subscription_type, package_id'
    )
    .eq('id', studentId)
    .maybeSingle()
  if (!before) return { error: 'الطالب غير موجود' }

  const oldLast = Number(before.last_session_num || 0)
  const rawLast = formData.get('last_session_num')
  let newLast =
    rawLast === null || String(rawLast).trim() === ''
      ? oldLast
      : Math.max(0, Math.floor(Number(rawLast) || 0))
  const origLastRaw = formData.get('orig_last_session_num')
  if (origLastRaw !== null && String(origLastRaw).trim() !== '' && Number(origLastRaw) === newLast) {
    const { data: fresh } = await sb.from('students').select('last_session_num').eq('id', studentId).maybeSingle()
    if (fresh && Number(fresh.last_session_num) !== oldLast) {
      newLast = Number(fresh.last_session_num) || newLast
    }
  }

  const sessions = formData.get('monthly_sessions') ? Number(formData.get('monthly_sessions')) : null
  const duration = formData.get('session_duration') ? Number(formData.get('session_duration')) : null
  let perSession = Number(formData.get('price_per_session') || 0) || null
  if (perSession != null && perSession < 0) return { error: 'سعر الحصة غير صالح' }
  if (perSession != null) perSession = Math.round(perSession * 100) / 100

  const amountDue = Number(formData.get('amount_due') || 0)
  const packageId = String(formData.get('package_id') || '').trim() || null
  const subscriptionType = packageId ? 'باقة' : String(formData.get('subscription_type') || '') || null

  const quota = (sessions && sessions > 0 ? sessions : null) || packageSize(before)
  const check = validateSessionWithinPackage(newLast, quota)
  if (!check.ok) return { error: check.error }

  const newTeacherId = String(formData.get('teacher_id') || '') || null
  const joinRaw = String(formData.get('join_date') || '').trim()

  const payload: Record<string, unknown> = {
    name: String(formData.get('name') || '').trim() || undefined,
    phone: String(formData.get('phone') || '') || null,
    monthly_sessions: sessions,
    session_duration: duration,
    price_per_session: perSession,
    amount_due: amountDue,
    last_session_num: newLast,
    teacher_id: newTeacherId,
    package_id: packageId,
  }
  if (subscriptionType) payload.subscription_type = subscriptionType
  if (joinRaw) payload.join_date = joinRaw.slice(0, 10)

  const rawRate = formData.get('teacher_session_rate')
  if (rawRate !== null && String(rawRate).trim() !== '') {
    const r = Math.round((Number(rawRate) || 0) * 100) / 100
    if (!(r > 0)) return { error: 'سعر الحصة للمعلم لازم يكون أكبر من صفر' }
    payload.teacher_session_rate = r
  }

  const origDueRaw = formData.get('orig_amount_due')
  if (origDueRaw !== null && String(origDueRaw).trim() !== '' && Number(origDueRaw) === amountDue) {
    delete payload.amount_due
  }

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const { error } = await sb.from('students').update(payload).eq('id', studentId)
  if (error) {
    if (/package_id/.test(error.message)) {
      delete payload.package_id
      const { error: e2 } = await sb.from('students').update(payload).eq('id', studentId)
      if (e2) return { error: e2.message }
    } else if (/teacher_session_rate/.test(error.message)) {
      return {
        error:
          'عمود سعر المعلم مش موجود — نفّذ migration 009_teacher_session_rate.sql في Supabase ثم جرّب تاني',
      }
    } else {
      return { error: error.message }
    }
  }

  const adsFee = Math.max(0, Math.round((Number(formData.get('ads_fee') || 0) || 0) * 100) / 100)
  const supervisionFee = Math.max(
    0,
    Math.round((Number(formData.get('supervision_fee') || 0) || 0) * 100) / 100
  )
  const otherFee = Math.max(0, Math.round((Number(formData.get('other_fee') || 0) || 0) * 100) / 100)

  await sb.from('activity_log').insert({
    actor_id: user.id,
    action: 'student_extra_costs',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      ads_fee: adsFee,
      supervision_fee: supervisionFee,
      other_fee: otherFee,
      price_per_session: perSession,
      teacher_session_rate: payload.teacher_session_rate ?? null,
      monthly_sessions: sessions,
    },
  })

  await sb.from('activity_log').insert({
    actor_id: user.id,
    action: 'supervisor_edit_student',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      name: payload.name,
      last_session_num: { from: oldLast, to: newLast },
      teacher_id: { from: before.teacher_id, to: newTeacherId },
      package_id: packageId,
      price_per_session: perSession,
      teacher_session_rate: payload.teacher_session_rate ?? null,
      ads_fee: adsFee,
      supervision_fee: supervisionFee,
      other_fee: otherFee,
    },
  })

  revalidateAll()
  const sess = sessions && sessions > 0 ? sessions : Number(before.monthly_sessions) || 0
  const parent = Number(perSession) || 0
  const teacher = Number(payload.teacher_session_rate) || 0
  const income = parent * sess
  const cost = teacher * sess + adsFee + supervisionFee + otherFee
  const profit = income - cost
  const profitNote =
    sess > 0
      ? ` · ربح تقريبي ${Math.round(profit * 100) / 100} ج (${profit >= 0 ? 'مكسب' : 'خسارة'})`
      : ''

  return {
    success: true,
    message:
      (newLast !== oldLast
        ? `تم الحفظ · رقم الحصة ${oldLast} → ${newLast}`
        : packageId
          ? 'تم حفظ بيانات الطالب والباقة'
          : 'تم حفظ بيانات الطالب') + profitNote,
  }
}
