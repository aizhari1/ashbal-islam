'use server'

import { requireStaff } from '@/lib/auth-guards'
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
  const staff = await requireStaff()
  if (!staff.ok) return { error: staff.error || 'غير مصرح' }
  const user = { id: staff.userId! }

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
    if (fresh && Number(fresh.last_session_num || 0) !== newLast) {
      newLast = Number(fresh.last_session_num || 0)
    }
  }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'الاسم مطلوب' }

  const phone = String(formData.get('phone') || '').trim() || null
  const status = String(formData.get('status') || '').trim() || null
  const newTeacherId = String(formData.get('teacher_id') || '').trim() || null
  const packageId = String(formData.get('package_id') || '').trim() || null

  let sessions: number | null = null
  const rawSessions = formData.get('monthly_sessions')
  if (rawSessions !== null && String(rawSessions).trim() !== '') {
    sessions = Math.max(0, Math.floor(Number(rawSessions) || 0))
  }

  let duration: number | null = null
  const rawDur = formData.get('session_duration')
  if (rawDur !== null && String(rawDur).trim() !== '') {
    duration = Math.max(0, Math.floor(Number(rawDur) || 0))
  }

  let perSession: number | null = null
  const rawPrice = formData.get('price_per_session')
  if (rawPrice !== null && String(rawPrice).trim() !== '') {
    perSession = Math.round((Number(rawPrice) || 0) * 100) / 100
  }
  if (perSession != null && perSession < 0) return { error: 'سعر الحصة غير صالح' }

  let teacherRate: number | null = null
  const rawRate = formData.get('teacher_session_rate')
  if (rawRate !== null && String(rawRate).trim() !== '') {
    teacherRate = Math.round((Number(rawRate) || 0) * 100) / 100
  }
  if (teacherRate != null && !(teacherRate > 0)) {
    return { error: 'سعر الحصة للمعلم لازم يكون أكبر من صفر' }
  }

  const pkgSize = packageId ? await packageSize(sb as any, packageId) : Number(before.monthly_sessions) || 0
  const check = validateSessionWithinPackage(newLast, pkgSize || sessions || Number(before.monthly_sessions) || 0)
  if (!check.ok) return { error: check.error }

  const payload: Record<string, unknown> = {
    name,
    phone,
    last_session_num: newLast,
  }
  if (status) payload.status = status
  if (newTeacherId !== undefined) payload.teacher_id = newTeacherId || null
  if (packageId) payload.package_id = packageId
  if (sessions != null) payload.monthly_sessions = sessions
  if (duration != null) payload.session_duration = duration
  if (perSession != null) payload.price_per_session = perSession
  if (teacherRate != null) payload.teacher_session_rate = teacherRate

  const { error } = await sb.from('students').update(payload).eq('id', studentId)
  if (error) {
    if (/package_id/.test(error.message)) {
      delete payload.package_id
      const { error: e2 } = await sb.from('students').update(payload).eq('id', studentId)
      if (e2) return { error: e2.message }
    } else if (/teacher_session_rate/.test(error.message)) {
      return {
        error: error.message + ' — عمود سعر المعلم مش موجود؟ راجع قاعدة البيانات',
      }
    } else {
      return { error: error.message }
    }
  }

  const adsFee = Math.round((Number(formData.get('ads_fee') || 0) || 0) * 100) / 100
  const supervisionFee = Math.round((Number(formData.get('supervision_fee') || 0) || 0) * 100) / 100
  const otherFee = Math.round((Number(formData.get('other_fee') || 0) || 0) * 100) / 100

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
