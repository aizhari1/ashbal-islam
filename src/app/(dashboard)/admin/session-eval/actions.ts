'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { currentMonthKey } from '@/lib/dues'

async function actor() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle()
  const role = String(p?.role || '')
  if (!['admin', 'supervisor'].includes(role)) return null
  return { user, role, name: p?.full_name || role }
}

export async function saveSessionTeacherEval(formData: FormData) {
  try {
    const a = await actor()
    if (!a) return { error: 'للإدارة والإشراف فقط' }

    const teacherId = String(formData.get('teacher_id') || '').trim()
    const studentId = String(formData.get('student_id') || '').trim() || null
    const sessionDate = String(formData.get('session_date') || '').trim()
    const attendanceId = String(formData.get('attendance_id') || '').trim() || null
    const camera = String(formData.get('camera') || '').trim()
    const performance = Math.min(5, Math.max(1, Math.round(Number(formData.get('performance') || 3))))
    const quality = Math.min(5, Math.max(1, Math.round(Number(formData.get('quality') || 3))))
    const notes = String(formData.get('notes') || '').trim() || null

    if (!teacherId) return { error: 'اختَر المعلم' }
    if (!sessionDate) return { error: 'اختَر تاريخ الحصة' }
    if (!['مفتوحة', 'مغلقة', 'جزئي'].includes(camera)) {
      return { error: 'حدّد حالة الكاميرا (مفتوحة / مغلقة / جزئي)' }
    }

    let sb: any
    try {
      sb = serviceClient()
    } catch {
      sb = await createClient()
    }

    const { data: teacher } = await sb.from('teachers').select('id, name').eq('id', teacherId).maybeSingle()
    if (!teacher) return { error: 'المعلم غير موجود' }

    let studentName: string | null = null
    if (studentId) {
      const { data: st } = await sb.from('students').select('name').eq('id', studentId).maybeSingle()
      studentName = st?.name || null
    }

    const avg = Math.round(((performance + quality) / 2) * 10) / 10

    const { error } = await sb.from('activity_log').insert({
      actor_id: a.user.id,
      action: 'session_teacher_eval',
      entity_type: 'teacher',
      entity_id: teacherId,
      details: {
        teacher_name: teacher.name,
        teacher_id: teacherId,
        student_id: studentId,
        student_name: studentName,
        session_date: sessionDate,
        attendance_id: attendanceId,
        camera,
        performance,
        quality,
        score: avg,
        notes,
        evaluator_role: a.role,
        evaluator_name: a.name,
        month: currentMonthKey(),
      },
    })
    if (error) return { error: error.message }

    revalidatePath('/admin/session-eval')
    revalidatePath('/admin/teacher-eval')
    revalidatePath('/admin/evaluations')
    revalidatePath('/supervisor')
    return {
      success: true,
      message: `تم تقييم حصة ${teacher.name} · كاميرا ${camera} · أداء ${performance} · جودة ${quality}`,
    }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع' }
  }
}
