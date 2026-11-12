'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveTeacherForUser } from '@/lib/resolve-teacher'
import { serviceClient } from '@/lib/supabase/service'

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

  return { teacher, students, error: null }
}
