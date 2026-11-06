'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

export async function updateSessionNum(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  const lastSessionNum = Number(formData.get('last_session_num') || 0)
  const lastSessionDate = String(formData.get('last_session_date') || '') || null

  if (!studentId) return { error: 'اختر طالب' }

  const { data: before, error: beforeErr } = await supabase
    .from('students')
    .select('id, last_session_num, teacher_id, session_duration')
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const oldLast = Number(before.last_session_num || 0)
  const teacherId = before.teacher_id || null
  const addedSessions: number[] = []

  // زيادة رقم الحصة → تسجيل حضور ناقص عند المعلم فوراً
  if (lastSessionNum > oldLast && teacherId) {
    const today = lastSessionDate || todayKey()
    const duration = Number(before.session_duration) || 30
    const rows = []
    for (let n = oldLast + 1; n <= lastSessionNum; n++) {
      rows.push({
        student_id: studentId,
        teacher_id: teacherId,
        session_date: today,
        status: 'حاضر',
        session_num: n,
        session_duration: duration,
        notes: `تعديل إداري — حصة رقم ${n} (أُضيفت من لوحة الإدارة)`,
      })
      addedSessions.push(n)
    }
    if (rows.length > 0) {
      const { error: attErr } = await supabase.from('attendance').insert(rows)
      if (attErr) return { error: `فشل تسجيل الحصص المضافة: ${attErr.message}` }
    }
  }

  const { error } = await supabase
    .from('students')
    .update({
      last_session_num: lastSessionNum,
      last_session_date: lastSessionDate || (addedSessions.length > 0 ? todayKey() : undefined),
    })
    .eq('id', studentId)

  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'session_num',
    entity_id: studentId,
    actor_id: user.id,
    details: {
      last_session_num: lastSessionNum,
      last_session_date: lastSessionDate,
      old_last_session_num: oldLast,
      added_session_nums: addedSessions,
    },
  })

  revalidatePath('/admin/edit-session')
  revalidatePath('/admin/students')
  revalidatePath('/admin/sessions-detail')
  revalidatePath('/admin/payroll')
  revalidatePath('/teacher')
  revalidatePath('/teacher/session')
  revalidatePath('/teacher/attendance')
  revalidatePath('/teacher/dues')

  return {
    ok: true,
    addedSessions: addedSessions.length,
    message:
      addedSessions.length > 0
        ? `تم · أُضيفت ${addedSessions.length} حصة لسجل المعلم`
        : 'تم الحفظ',
  }
}
