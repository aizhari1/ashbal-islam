'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveTeacherForUser } from '@/lib/resolve-teacher'

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
