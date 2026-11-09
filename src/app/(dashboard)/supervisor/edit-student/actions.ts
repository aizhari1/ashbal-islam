'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function revalidateAll() {
  for (const p of [
    '/supervisor/edit-student',
    '/supervisor/edit-session',
    '/admin/students',
    '/admin/edit-session',
    '/admin/session-settle',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/teacher',
    '/teacher/session',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/supervisor',
  ]) {
    revalidatePath(p)
  }
}

/**
 * تعديل بيانات الطالب فقط.
 * لا يضيف ولا يحذف حصص من سجل المعلم — المزامنة من صفحة التسوية / تعديل رقم الحصة.
 */
export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  const sb = serviceClient()
  const { data: before, error: beforeErr } = await sb
    .from('students')
    .select(
      'id, name, code, last_session_num, teacher_id, session_duration, price_per_session, monthly_sessions, subscription_type, package_id'
    )
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const oldLast = Number(before.last_session_num || 0)
  const rawLast = formData.get('last_session_num')
  const newLast =
    rawLast === null || String(rawLast).trim() === ''
      ? oldLast
      : Math.max(0, Math.floor(Number(rawLast) || 0))

  const packageIdRaw = String(formData.get('package_id') || '').trim()
  let sessions = Number(formData.get('monthly_sessions') || 0) || null
  let perSession = Number(formData.get('price_per_session') || 0) || null
  let duration = Number(formData.get('session_duration') || 30) || 30
  let amountDue = Number(formData.get('amount_due') || 0) || 0
  let packageId: string | null = packageIdRaw || null
  let subscriptionType: string | null = null

  if (packageIdRaw) {
    const { data: pkg, error: pkgErr } = await sb
      .from('packages')
      .select('id, name, sessions_count, duration_minutes, price, currency')
      .eq('id', packageIdRaw)
      .maybeSingle()
    if (pkgErr || !pkg) return { error: 'الباقة المختارة غير موجودة' }
    sessions = Number(pkg.sessions_count) || sessions
    perSession =
      Math.round((Number(pkg.price) / Math.max(1, Number(pkg.sessions_count))) * 100) / 100
    duration = Number(pkg.duration_minutes) || duration
    amountDue = Number(pkg.price) || amountDue
    packageId = pkg.id
    subscriptionType = 'باقة'
  } else if (formData.has('package_id')) {
    packageId = null
  }

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
    const r = Number(rawRate)
    if (!(r > 0)) return { error: 'سعر الحصة للمعلم لازم يكون أكبر من صفر' }
    payload.teacher_session_rate = r
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
    },
  })

  revalidateAll()
  return {
    success: true,
    message:
      newLast !== oldLast
        ? `تم الحفظ · رقم الحصة ${oldLast} → ${newLast}`
        : packageId
          ? 'تم حفظ بيانات الطالب والباقة'
          : 'تم حفظ بيانات الطالب',
  }
}
