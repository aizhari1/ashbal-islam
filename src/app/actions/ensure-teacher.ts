'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveTeacherForUser } from '@/lib/resolve-teacher'
import { serviceClient } from '@/lib/supabase/service'
import { teacherCountWindow } from '@/lib/teacher-window'

export async function ensureMyTeacher() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجّل', teacher: null }

  const r = await resolveTeacherForUser(supabase, user.id)
  if (!r.teacher) return { error: r.message || 'لا يوجد ملف معلم', teacher: null }
  return {
    teacher: { id: r.teacher.id, name: r.teacher.name, code: r.teacher.code },
    linked: r.linked,
    created: r.created,
    message: r.message,
  }
}

/**
 * غرفة التسميع: تحميل المعلم + الطلاب من السيرفر
 * (قراءة students من المتصفح بترجع فاضي بسبب RLS)
 */
export async function getMySessionRoom() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'انتهت الجلسة — سجّل دخول مرة تانية', teacher: null, students: [] }

  const r = await resolveTeacherForUser(supabase, user.id)
  if (!r.teacher?.id) {
    return { error: r.message || 'لا يوجد ملف معلم مرتبط بحسابك', teacher: null, students: [] }
  }

  const teacher = { id: r.teacher.id, name: r.teacher.name || '', code: r.teacher.code || null }

  // service role بعد التحقق من هوية المعلم — نفس بيانات صفحة طلابي
  let sb: ReturnType<typeof serviceClient> | typeof supabase = supabase
  try {
    sb = serviceClient()
  } catch {
    sb = supabase
  }

  const { data, error } = await sb
    .from('students')
    .select('id, code, name, phone, last_session_num, monthly_sessions, session_duration, subscription_type, status')
    .eq('teacher_id', teacher.id)
    .eq('status', 'نشط')
    .order('name')

  if (error) {
    return {
      error: error.message === 'Failed to fetch' ? 'مشكلة شبكة — حاول تاني' : error.message,
      teacher,
      students: [],
    }
  }

  const students = data || []
  if (!students.length) {
    return {
      error: 'مفيش طلاب نشطين مربوطين بيك — من الإشراف: تعديل طالب → اختَر هذا المعلم',
      teacher,
      students: [],
    }
  }

  // حصص كل طالب عند المعلم الشهر ده (بتصفّر أول الشهر وبعد التسوية) — من غير "من 12"
  const monthCounts: Record<string, number> = {}
  try {
    const w = await teacherCountWindow(sb as any, { id: teacher.id, name: teacher.name })
    let q = (sb as any)
      .from('attendance')
      .select('student_id')
      .eq('teacher_id', teacher.id)
      .in('status', ['حاضر', 'متأخر'])
      .lte('session_date', w.end)
    q = w.settledOn ? q.gt('session_date', w.settledOn) : q.gte('session_date', w.start)
    const { data: att } = await q.limit(5000)
    for (const a of att || []) {
      if (a.student_id) monthCounts[a.student_id] = (monthCounts[a.student_id] || 0) + 1
    }
  } catch {
    /* العدّ مش حرج */
  }

  return { teacher, students, monthCounts, error: null }
}
