'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function todayKey() {
  // تاريخ القاهرة YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
}

export async function supervisorEditStudent(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }

  const studentId = String(formData.get('student_id') || '')
  if (!studentId) return { error: 'اختر طالب' }

  // قراءة الحالة القديمة قبل التعديل
  const { data: before, error: beforeErr } = await supabase
    .from('students')
    .select('id, name, code, last_session_num, teacher_id, session_duration, price_per_session')
    .eq('id', studentId)
    .maybeSingle()
  if (beforeErr) return { error: beforeErr.message }
  if (!before) return { error: 'الطالب غير موجود' }

  const newLastSessionNum = Number(formData.get('last_session_num') || 0)
  const oldLastSessionNum = Number(before.last_session_num || 0)
  const newTeacherId = String(formData.get('teacher_id') || '') || null
  // المعلم اللي هتتنسب له الحصص المضافة: المعلم الجديد لو اتغير، وإلا القديم
  const effectiveTeacherId = newTeacherId || before.teacher_id || null

  const payload: Record<string, unknown> = {
    name: String(formData.get('name') || '').trim() || undefined,
    phone: String(formData.get('phone') || '') || null,
    monthly_sessions: Number(formData.get('monthly_sessions') || 0) || null,
    session_duration: Number(formData.get('session_duration') || 30) || 30,
    last_session_num: newLastSessionNum,
    amount_due: Number(formData.get('amount_due') || 0),
    price_per_session: Number(formData.get('price_per_session') || 25),
    teacher_id: newTeacherId,
  }

  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  // لو رقم الحصة زاد: نسجّل حصص حضور ناقصة في جدول attendance
  // عشان تظهر فوراً عند المعلم (سجل الحصص + الإجمالي + التقرير + الراتب)
  const addedSessions: number[] = []
  if (newLastSessionNum > oldLastSessionNum && effectiveTeacherId) {
    const today = todayKey()
    const duration = Number(payload.session_duration) || Number(before.session_duration) || 30
    const rows = []
    for (let n = oldLastSessionNum + 1; n <= newLastSessionNum; n++) {
      rows.push({
        student_id: studentId,
        teacher_id: effectiveTeacherId,
        session_date: today,
        status: 'حاضر',
        session_num: n,
        session_duration: duration,
        notes: `تعديل إداري — حصة رقم ${n} (أُضيفت من لوحة الإشراف)`,
      })
      addedSessions.push(n)
    }
    if (rows.length > 0) {
      const { error: attErr } = await supabase.from('attendance').insert(rows)
      if (attErr) return { error: `فشل تسجيل الحصص المضافة: ${attErr.message}` }
    }
  }

  const { error } = await supabase.from('students').update(payload).eq('id', studentId)
  if (error) return { error: error.message }

  await supabase.from('activity_log').insert({
    action: 'student_update',
    entity_id: studentId,
    actor_id: user.id,
    details: {
      ...payload,
      old_last_session_num: oldLastSessionNum,
      added_session_nums: addedSessions,
      synced_to_teacher: addedSessions.length > 0,
    },
  })

  revalidatePath('/supervisor/edit-student')
  revalidatePath('/admin/students')
  revalidatePath('/admin/sessions-detail')
  revalidatePath('/admin/payroll')
  revalidatePath('/teacher')
  revalidatePath('/teacher/session')
  revalidatePath('/teacher/attendance')
  revalidatePath('/teacher/dues')
  revalidatePath('/teacher/students')

  return {
    ok: true,
    addedSessions: addedSessions.length,
    message:
      addedSessions.length > 0
        ? `تم الحفظ · أُضيفت ${addedSessions.length} حصة لسجل المعلم (${addedSessions.join('، ')})`
        : 'تم حفظ التعديلات بنجاح',
  }
}
