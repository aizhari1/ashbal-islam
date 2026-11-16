'use server'

import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

/**
 * حذف نهائي للطالب من النظام كله:
 * حضور · دفعات · مواعيد · أي صف مرتبط · ثم سجل الطالب
 * للإدارة فقط
 */
export async function deleteStudentCompletely(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '')
  if (role !== 'admin') {
    return { error: 'الحذف النهائي للإدارة فقط' }
  }

  if (!studentId || !/^[0-9a-f-]{36}$/i.test(studentId)) {
    return { error: 'معرّف طالب غير صالح' }
  }

  let sb
  try {
    sb = serviceClient()
  } catch {
    sb = supabase
  }

  const { data: before, error: loadErr } = await sb
    .from('students')
    .select('id, code, name, teacher_id, status')
    .eq('id', studentId)
    .maybeSingle()
  if (loadErr) return { error: loadErr.message }
  if (!before) return { error: 'الطالب غير موجود أو اتحذف قبل كده' }

  const counts: Record<string, number> = {}

  async function wipe(table: string, col = 'student_id') {
    let total = 0
    for (let i = 0; i < 50; i++) {
      const { data, error } = await sb.from(table).delete().eq(col, studentId).select('id')
      if (error) {
        if (/does not exist|42703|42P01/i.test(error.message)) return total
        throw new Error(`${table}: ${error.message}`)
      }
      const n = data?.length || 0
      total += n
      if (n < 1000) break
    }
    counts[table] = total
    return total
  }

  try {
    await wipe('attendance')
    await wipe('payments')
    await wipe('schedule_entries')
    await wipe('evaluations').catch(() => 0)
    await wipe('parent_evaluations').catch(() => 0)
    await wipe('student_notes').catch(() => 0)
    await wipe('notes').catch(() => 0)
  } catch (e: any) {
    return { error: e?.message || 'فشل مسح البيانات المرتبطة' }
  }

  const { error: delErr } = await sb.from('students').delete().eq('id', studentId)
  if (delErr) return { error: `اتمسحت البيانات المرتبطة لكن فشل حذف الطالب: ${delErr.message}` }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'delete_student_complete',
    entity_type: 'student',
    entity_id: studentId,
    details: {
      code: before.code,
      name: before.name,
      teacher_id: before.teacher_id,
      status: before.status,
      wiped: counts,
    },
  })

  for (const p of [
    '/admin/students',
    '/admin',
    '/supervisor',
    '/supervisor/edit-student',
    '/admin/finance',
    '/admin/payroll',
    '/admin/session-settle',
    '/admin/payments',
    '/teacher',
    '/teacher/students',
  ]) {
    revalidatePath(p)
  }

  return {
    success: true,
    message: `تم حذف «${before.name}» (${before.code}) نهائيًا من النظام`,
    wiped: counts,
  }
}
