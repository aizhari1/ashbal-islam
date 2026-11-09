'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'

export async function logTeacherAbsence(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مسجل' }

    const teacherId = String(formData.get('teacher_id') || '').trim()
    const absenceDate = String(formData.get('absence_date') || '').trim()
    const reason = String(formData.get('reason') || '').trim() || null

    if (!teacherId || !absenceDate) return { error: 'اختَر المعلم والتاريخ' }

    let sb
    try {
      sb = serviceClient()
    } catch {
      sb = supabase
    }

    const { data: teacher, error: tErr } = await sb
      .from('teachers')
      .select('id, name')
      .eq('id', teacherId)
      .maybeSingle()
    if (tErr) return { error: tErr.message }
    if (!teacher) return { error: 'المعلم غير موجود' }

    const { error } = await sb.from('activity_log').insert({
      action: 'teacher_absence',
      entity_type: 'teacher',
      entity_id: teacherId,
      actor_id: user.id,
      details: {
        teacher_name: teacher.name,
        teacher_id: teacherId,
        absence_date: absenceDate,
        reason,
      },
    })
    if (error) return { error: `فشل التسجيل: ${error.message}` }

    revalidatePath('/admin/teacher-absences')
    revalidatePath('/admin')
    revalidatePath('/supervisor')
    return { success: true, message: `تم تسجيل غياب «${teacher.name}» يوم ${absenceDate}` }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع' }
  }
}
