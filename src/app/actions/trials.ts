'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { todayKey } from '@/lib/dues'

const ATTEND = ['حضر', 'غاب']
const INTERACT = ['ممتاز', 'جيد', 'ضعيف']
const REC = ['', 'اشترك', 'لم يشترك']
const clean = (v: unknown, n = 300) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

/** تقرير الحصة التجريبية (زي القديم): مرة واحدة لكل تجربة، والنتيجة تحدد المحاسبة */
export async function submitTrialReport(
  studentId: string,
  d: { attendance: string; interaction: string; level: string; suitability: string; recommendation: string; notes: string }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'غير مصرح' }
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { success: false, message: 'معرّف غير صالح' }

  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()
  if (!teacher) return { success: false, message: 'لا يوجد ملف معلم مرتبط بحسابك' }

  const attendance = ATTEND.includes(d.attendance) ? d.attendance : 'حضر'
  const interaction = INTERACT.includes(d.interaction) ? d.interaction : 'جيد'
  const rec = REC.includes(d.recommendation) ? d.recommendation : ''

  // الملكية والحالة بيتأكدوا بالسيرفر (طالب تجريبي ومعلمه هو نفس المعلم)
  const sb = serviceClient()
  const { data: st } = await sb.from('students').select('id, code, name, teacher_id, status, notes').eq('id', studentId).maybeSingle()
  if (!st || String(st.status) !== 'تجريبي') return { success: false, message: 'الطالب مش في قائمة التجريبي' }
  if (st.teacher_id !== teacher.id) return { success: false, message: 'الحصة التجريبية دي مش بتاعتك' }

  const { data: prev } = await sb.from('activity_log').select('id').eq('action', 'trial_report').eq('entity_id', studentId).limit(1)
  if (prev && prev.length) return { success: true, alreadyExists: true, message: 'تقرير هذه التجربة مسجّل مسبقًا — لم يتم التكرار.' }

  const attended = attendance === 'حضر'
  const result = !attended ? 'لم تتم' : rec === 'اشترك' ? 'اشترك' : rec === 'لم يشترك' ? 'لم يشترك' : 'تمت'
  const details = {
    student_name: st.name, student_code: st.code, teacher_id: teacher.id, teacher_name: teacher.name,
    attendance, interaction, level: clean(d.level), suitability: clean(d.suitability),
    recommendation: rec || result, notes: clean(d.notes, 600), result,
  }

  const { error } = await sb.from('activity_log').insert({
    actor_id: user.id, action: 'trial_report', entity_type: 'student', entity_id: studentId, details,
  })
  if (error) return { success: false, message: 'تعذر حفظ التقرير: ' + error.message }

  // لم يشترك → يتشال من قائمة التجريبي (بنحوّله لمنسحب بدل الحذف عشان السجل يفضل محفوظ)
  if (result === 'لم يشترك') {
    await sb.from('students').update({ status: 'منسحب' }).eq('id', studentId)
  }
  // اشترك وحضر → الحصة بتتحسب للمعلم (حصة حاضر في سجله)
  if (result === 'اشترك') {
    await sb.from('attendance').insert({
      student_id: studentId, teacher_id: teacher.id, session_date: todayKey(), status: 'حاضر', notes: 'حصة تجريبية — اشترك الطالب',
    })
  }

  // نسخة للإدارة في الملاحظات (زي القديم)
  const text =
    `📝 تقرير حصة تجريبية — الطالب: ${st.name} | الحضور: ${attendance}` +
    (details.interaction ? ` | التفاعل: ${details.interaction}` : '') +
    (details.level ? ` | المستوى: ${details.level}` : '') +
    (details.suitability ? ` | الملاءمة: ${details.suitability}` : '') +
    ` | النتيجة: ${result}` + (details.notes ? ` | ملاحظات: ${details.notes}` : '')
  await sb.from('activity_log').insert({
    actor_id: user.id, action: 'teacher_note', entity_type: 'note', details: { text, teacher_name: teacher.name, kind: 'trial_report' },
  })

  revalidatePath('/teacher')
  revalidatePath('/teacher/trials')
  revalidatePath('/admin/trials')
  return {
    success: true,
    message:
      result === 'اشترك' ? 'تم حفظ التقرير — اشترك الطالب وتتحسب الحصة لك.'
      : result === 'لم يشترك' ? 'تم حفظ التقرير — الطالب لم يشترك وتم إخراجه من التجريبي.'
      : 'تم حفظ التقرير.',
  }
}
