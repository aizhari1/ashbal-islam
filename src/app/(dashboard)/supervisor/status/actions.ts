'use server'

import { requireStaff } from '@/lib/auth-guards'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function changeStudentStatus(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل — سجّل الدخول مرة أخرى' }
  const __staff = await requireStaff()
  if (!__staff.ok) return { error: __staff.error || 'غير مصرح' }

  const studentId = String(formData.get('student_id') || '')
  const status = String(formData.get('status') || '')
  const note = String(formData.get('note') || '').trim() || null

  if (!studentId) return { error: 'اختَر الطالب أولاً' }
  if (!status) return { error: 'اختَر الحالة الجديدة' }

  const { data: student } = await supabase
    .from('students')
    .select('id, name, code, status')
    .eq('id', studentId)
    .maybeSingle()

  if (!student) return { error: 'الطالب غير موجود' }

  const patch: Record<string, unknown> = { status }
  if (note) patch.notes = note

  const { error } = await supabase.from('students').update(patch).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'student_status',
    entity_type: 'student',
    entity_id: studentId,
    actor_id: user.id,
    details: { status, note, prev_status: student.status, name: student.name, code: student.code },
  })

  revalidatePath('/supervisor/status')
  revalidatePath('/supervisor')
  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)

  const msg = `تم تغيير حالة «${student.name}» (${student.code}) من «${student.status || '—'}» إلى «${status}»`
  return { ok: true, message: msg }
}
