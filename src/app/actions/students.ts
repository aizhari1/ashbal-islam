'use server'

import { requireStaff } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cairoToday } from '@/lib/student-tenure'
import { serviceClient } from '@/lib/supabase/service'
import { fetchAll } from '@/lib/dues-engine'

/**
 * الكود الجديد = أكبر رقم موجود فعليًا + 1 (بنفس شكل أحدث كود: بادئة وعدد خانات).
 */
async function nextStudentCode(): Promise<string> {
  const rows = await fetchAll<{ id: string; code: string | null }>((from, to) =>
    serviceClient().from('students').select('id, code').order('id').range(from, to)
  )
  let maxNum = 0
  let prefix = 'ST-'
  let width = 4
  for (const r of rows) {
    const m = String(r.code || '').match(/^(\D*)(\d+)$/)
    if (!m) continue
    const n = parseInt(m[2], 10)
    if (n >= maxNum) {
      maxNum = n
      prefix = m[1]
      width = m[2].length
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(width, '0')}`
}

export async function addStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error }

  const name = String(formData.get('name') || '').trim()
  if (!name) return { error: 'الاسم مطلوب' }

  const joinRaw = String(formData.get('join_date') || '').trim()
  const join_date = joinRaw || cairoToday()

  const packageId = String(formData.get('package_id') || '').trim()
  let sessions = formData.get('monthly_sessions') ? Number(formData.get('monthly_sessions')) : 4
  let perSession = formData.get('price_per_session') ? Number(formData.get('price_per_session')) : 60
  let subscription = String(formData.get('subscription_type') || 'شهري')
  let currency = String(formData.get('currency') || 'EGP')
  let duration = formData.get('session_duration') ? Number(formData.get('session_duration')) : 30
  let pkgInfo: { id: string; name: string; price: number } | null = null
  if (packageId) {
    const { data: pkg, error: pkgErr } = await serviceClient()
      .from('packages')
      .select('id, name, sessions_count, duration_minutes, price, currency')
      .eq('id', packageId)
      .maybeSingle()
    if (pkgErr || !pkg) return { error: 'الباقة المختارة غير موجودة' }
    sessions = Number(pkg.sessions_count) || sessions
    perSession = Math.round((Number(pkg.price) / sessions) * 100) / 100
    subscription = 'باقة'
    currency = pkg.currency || currency
    if (!formData.get('session_duration')) duration = Number(pkg.duration_minutes) || 30
    pkgInfo = { id: pkg.id, name: pkg.name, price: Number(pkg.price) }
  }
  if (!(sessions > 0)) return { error: 'عدد الحصص غير صالح' }
  if (!(perSession > 0)) return { error: 'سعر الحصة على ولي الأمر غير صالح' }

  const teacherRate = Number(formData.get('teacher_session_rate'))
  if (!(teacherRate > 0)) return { error: 'سعر الحصة للمعلم مطلوب (أكبر من صفر)' }

  const row = {
    name,
    teacher_id: formData.get('teacher_id') || null,
    phone: formData.get('phone') || null,
    email: formData.get('email') || null,
    age: formData.get('age') ? Number(formData.get('age')) : null,
    country: formData.get('country') || null,
    subscription_type: subscription,
    session_duration: duration,
    price_per_session: perSession,
    teacher_session_rate: teacherRate,
    package_id: pkgInfo?.id ?? null,
    currency,
    status: formData.get('status') || 'نشط',
    monthly_sessions: sessions,
    join_date,
  }

  let data: any = null
  let error: { message: string; code?: string } | null = null
  let code = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    code = await nextStudentCode()
    const res = await serviceClient().from('students').insert({ code, ...row }).select().single()
    data = res.data
    error = res.error
    if (!error || (error as any).code !== '23505') break
  }

  if (error) {
    if (/teacher_session_rate/.test(error.message)) {
      return { error: 'عمود سعر المعلم مش موجود في قاعدة البيانات — نفّذ ملف migration 009_teacher_session_rate.sql في Supabase SQL Editor ثم جرّب تاني.' }
    }
    return { error: error.message }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'add_student',
    entity_type: 'student',
    entity_id: data.id,
    details: { name, code, join_date, package: pkgInfo?.name ?? null, teacher_session_rate: teacherRate },
  })

  revalidatePath('/admin/students')
  return { success: true, data }
}

export async function updateStudentStatus(studentId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error }

  const { error } = await supabase.from('students').update({ status }).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id, action: 'change_status', entity_type: 'student', entity_id: studentId, details: { status },
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function transferStudent(studentId: string, teacherId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error }

  const { error } = await supabase.from('students').update({ teacher_id: teacherId || null }).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    actor_id: user.id, action: 'transfer_student', entity_type: 'student', entity_id: studentId, details: { teacher_id: teacherId },
  })

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}

export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error }

  const patch: Record<string, unknown> = {}
  for (const key of ['name', 'phone', 'email', 'country', 'subscription_type', 'currency', 'status']) {
    const v = formData.get(key)
    if (v !== null && v !== undefined && String(v) !== '') patch[key] = String(v)
  }
  for (const key of ['age', 'session_duration', 'price_per_session', 'teacher_session_rate', 'monthly_sessions', 'amount_due']) {
    const v = formData.get(key)
    if (v !== null && String(v) !== '') patch[key] = Number(v)
  }
  if (formData.get('teacher_id')) patch.teacher_id = formData.get('teacher_id')
  const joinDate = formData.get('join_date')
  if (joinDate !== null && String(joinDate).trim() !== '') {
    patch.join_date = String(joinDate).slice(0, 10)
  }

  const { error } = await supabase.from('students').update(patch).eq('id', studentId)
  if (error) return { error: error.message }

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return { success: true }
}
