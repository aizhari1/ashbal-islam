'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { dueAfterPackageComplete, nextPackageSessionNum, packageSize, todayKey, validateSessionWithinPackage } from '@/lib/dues'

/** حالات الحضور الفعلي (تُحسب في العداد والتقارير) */
const PRESENT_STATUSES = new Set(['حاضر', 'متأخر', 'تم الحضور'])

function normalizeStatus(status: string): string {
  if (status === 'تم الحضور') return 'حاضر'
  if (status === 'لم يحضر') return 'غائب'
  return status
}

function isPresentStatus(status: string): boolean {
  return PRESENT_STATUSES.has(status) || PRESENT_STATUSES.has(normalizeStatus(status))
}

/** بعد حذف/تعديل: رقم آخر حصة للطالب = آخر حضور فعلي متبقي */
async function syncStudentLastSession(
  sb: ReturnType<typeof serviceClient>,
  studentId: string
): Promise<number> {
  const { data } = await sb
    .from('attendance')
    .select('session_num, session_date')
    .eq('student_id', studentId)
    .in('status', ['حاضر', 'متأخر'])
    .order('session_date', { ascending: false })
    .order('session_num', { ascending: false })
    .limit(5)

  const last = (data || [])[0]
  const lastNum = last?.session_num != null ? Number(last.session_num) : 0
  await sb
    .from('students')
    .update({
      last_session_num: lastNum,
      last_session_date: last?.session_date || null,
    })
    .eq('id', studentId)
  return lastNum
}

type Svc = ReturnType<typeof serviceClient>

function tryServiceClient(): Svc | null {
  try {
    return serviceClient()
  } catch {
    return null
  }
}

/**
 * رقم آخر حصة "الفعلي" قبل التسجيل.
 * العدّاد المخزّن هو الأصل (الإدارة ممكن تعدّله)، إلا لو كان متأخر عن سجل الحضور:
 * يعني آخر حضور مسجّل بتاريخ أحدث من last_session_date → تحديث عدّاد سابق فشل، فنكمل من رقم الحضور
 * (من غير كده التقرير بيرجع لرقم 1 كل مرة).
 */
async function resolvePrevCounter(
  sb: Svc | null,
  studentId: string,
  student: { last_session_num?: number | null; last_session_date?: string | null } | null
): Promise<number> {
  const stored = Math.max(0, Number(student?.last_session_num) || 0)
  if (!sb) return stored
  try {
    const { data } = await sb
      .from('attendance')
      .select('session_num, session_date')
      .eq('student_id', studentId)
      .in('status', ['حاضر', 'متأخر'])
      .not('session_num', 'is', null)
      .order('session_date', { ascending: false })
      .order('session_num', { ascending: false })
      .limit(1)
    const last = data?.[0]
    if (!last || last.session_num == null) return stored
    const lastDate = String(last.session_date).slice(0, 10)
    const counterDate = student?.last_session_date ? String(student.last_session_date).slice(0, 10) : ''
    if (lastDate > counterDate) return Math.max(0, Number(last.session_num) || 0)
  } catch {
    /* نرجع للعدّاد المخزّن */
  }
  return stored
}

/** يكتب تحديث الطالب ويتأكد فعلًا إن صف اتحدّث (تحديث RLS المحجوب بيرجع بدون خطأ وبدون صفوف) */
async function writeStudentPatch(
  sb: Svc | null,
  userClient: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  patch: Record<string, unknown>
): Promise<string | null> {
  let lastMsg = 'تعذّر تحديث عدّاد الطالب'
  for (const client of [sb, userClient]) {
    if (!client) continue
    const { data, error } = await client.from('students').update(patch).eq('id', studentId).select('id')
    if (!error && data && data.length > 0) return null
    if (error) lastMsg = error.message
  }
  return lastMsg
}

/** تقدّم عدّاد الطالب عند تحويل غياب→حضور في نفس اليوم */
async function advanceStudentCounter(
  sb: Svc | null,
  userClient: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  today: string
): Promise<{ nextSession: number; completedPackage: boolean; dueMsg: string; error?: string }> {
  const { data: student } = await (sb ?? userClient)
    .from('students')
    .select('last_session_num, last_session_date, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', studentId)
    .single()

  const quota = packageSize(student || {})
  const prevNum = await resolvePrevCounter(sb, studentId, student)
  const { next: nextSession, completedPackage } = nextPackageSessionNum(prevNum, quota)

  const patch: Record<string, unknown> = {
    last_session_date: today,
    last_session_num: nextSession,
  }
  let dueMsg = ''
  if (completedPackage && student) {
    const due = dueAfterPackageComplete(student)
    if (due > 0) {
      const prevDue = Number(student.amount_due || 0)
      patch.amount_due = prevDue > 0 ? prevDue + due : due
      dueMsg = ` · مستحق ${patch.amount_due} ج · الباقة خلصت ويبدأ العد من 1`
    } else {
      dueMsg = ' · الباقة خلصت ويبدأ العد من 1'
    }
  }
  const error = await writeStudentPatch(sb, userClient, studentId, patch)
  return { nextSession, completedPackage, dueMsg, ...(error ? { error } : {}) }
}

function revalidateTeacherPaths() {
  const paths = [
    '/teacher',
    '/teacher/session',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/admin',
    '/admin/attended',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/admin/students',
    '/admin/edit-session',
    '/admin/session-settle',
    '/supervisor',
    '/supervisor/edit-student',
    '/supervisor/edit-session',
  ]
  for (const path of paths) revalidatePath(path)
}

export async function recordAttendance(data: {
  student_id: string
  teacher_id?: string | null
  status: string
  hifz_from?: string
  hifz_to?: string
  muraja_from?: string
  muraja_to?: string
  tajweed_notes?: string
  rating?: number
  notes?: string
  session_num?: number
  report_text?: string
  score_new?: number | null
  score_recent?: number | null
  score_far?: number | null
  session_duration?: number | null
  new_memorization?: string | null
  recent_past?: string | null
  far_past?: string | null
  arabic_lang?: string | null
  tarbiya_note?: string | null
  sharii_note?: string | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const today = todayKey()

  let teacherId: string | null = data.teacher_id || null
  if (!teacherId) {
    const { data: t } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
    teacherId = t?.id || null
  }
  if (!teacherId) {
    const { data: st0 } = await supabase.from('students').select('teacher_id').eq('id', data.student_id).maybeSingle()
    teacherId = st0?.teacher_id || null
  }

  const score = (v: unknown) => {
    if (v === null || v === undefined || v === '') return null
    const n = Math.round(Number(v))
    return Number.isFinite(n) ? Math.min(10, Math.max(0, n)) : null
  }
  const txt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 1000) : null)
  const dur = Number(data.session_duration)
  const details = {
    session_duration: Number.isFinite(dur) && dur >= 5 && dur <= 300 ? Math.round(dur) : null,
    score_new: score(data.score_new),
    score_recent: score(data.score_recent),
    score_far: score(data.score_far),
    new_memorization: txt(data.new_memorization),
    recent_past: txt(data.recent_past),
    far_past: txt(data.far_past),
    arabic_lang: txt(data.arabic_lang),
    tarbiya_note: txt(data.tarbiya_note),
    sharii_note: txt(data.sharii_note),
  }

  const withNum = (t: string | null | undefined, n: number | null | undefined) =>
    t && n ? t.replace(/(رقم الحلقة: )\d+/, `$1${n}`) : t || null

  const { data: existing } = await supabase
    .from('attendance')
    .select('id, session_num, status')
    .eq('student_id', data.student_id)
    .eq('session_date', today)
    .limit(1)

  if (existing && existing.length > 0) {
    const prevStatus = existing[0].status || ''
    const wasPresent = isPresentStatus(prevStatus)
    const willBePresent = isPresentStatus(data.status)
    const normStatus = normalizeStatus(data.status)

    let sessionNum = existing[0].session_num
    let dueMsg = ''

    // غياب/معذور → حاضر/متأخر في نفس اليوم: تقدّم العداد
    if (!wasPresent && willBePresent) {
      const adv = await advanceStudentCounter(tryServiceClient(), supabase, data.student_id, today)
      // العدّاد ما اتحدّثش → منكمّلش (كان هيتسجّل حضور برقم غلط ويرجع لـ 1 بعدها)
      if (adv.error) return { error: `تعذّر تحديث عدّاد الطالب: ${adv.error} — لم يتم الحفظ، حاول مرة أخرى` }
      sessionNum = adv.nextSession
      dueMsg = adv.dueMsg
    }

    const { data: row, error } = await supabase
      .from('attendance')
      .update({
        status: normStatus,
        hifz_from: data.hifz_from || null,
        hifz_to: data.hifz_to || null,
        muraja_from: data.muraja_from || null,
        muraja_to: data.muraja_to || null,
        tajweed_notes: data.tajweed_notes || null,
        rating: data.rating || null,
        notes: willBePresent ? withNum(data.report_text || data.notes, sessionNum) : data.report_text || data.notes || null,
        session_num: willBePresent ? sessionNum : existing[0].session_num,
        teacher_id: teacherId,
        ...details,
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return { error: error.message }

    revalidateTeacherPaths()
    return {
      success: true,
      data: row,
      message: !wasPresent && willBePresent
        ? `اتحدّث لتسجيل حضور — حصة رقم ${sessionNum}${dueMsg}`
        : 'اتحدّث تقرير اليوم',
    }
  }

  const { data: student } = await supabase
    .from('students')
    .select('last_session_num, last_session_date, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', data.student_id)
    .single()

  const svc = tryServiceClient()
  const quota = packageSize(student || {})
  const prevNum = await resolvePrevCounter(svc, data.student_id, student)
  const { next: nextSession, completedPackage } = nextPackageSessionNum(prevNum, quota)

  const isPresent = isPresentStatus(data.status)
  const normStatus = normalizeStatus(data.status)

  const { data: row, error } = await supabase
    .from('attendance')
    .insert({
      student_id: data.student_id,
      teacher_id: teacherId,
      session_date: today,
      status: normStatus,
      hifz_from: data.hifz_from || null,
      hifz_to: data.hifz_to || null,
      muraja_from: data.muraja_from || null,
      muraja_to: data.muraja_to || null,
      tajweed_notes: data.tajweed_notes || null,
      rating: data.rating || null,
      notes: isPresent ? withNum(data.report_text || data.notes, nextSession) : data.report_text || data.notes || null,
      session_num: isPresent ? nextSession : data.session_num || null,
      ...details,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  let dueMsg = ''
  if (student && isPresent) {
    const patch: Record<string, unknown> = {
      last_session_date: today,
      last_session_num: nextSession,
    }
    if (completedPackage) {
      const due = dueAfterPackageComplete(student)
      if (due > 0) {
        const prevDue = Number(student.amount_due || 0)
        // تراكم المستحق لو الباقة خلصت ومفيش دفع — مش استبدال لو في باقي قديم
        patch.amount_due = prevDue > 0 ? prevDue + due : due
        dueMsg = ` · مستحق ${patch.amount_due} ج · الباقة خلصت ويبدأ العد من 1`
      } else {
        dueMsg = ' · الباقة خلصت ويبدأ العد من 1'
      }
    }
    // service client عشان التحديث يمشي حتى لو RLS يمنع المعلم — ونتأكد إنه نجح فعلًا
    const upErr = await writeStudentPatch(svc, supabase, data.student_id, patch)
    if (upErr) {
      // نمسح الحصة اللي لسه اتسجّلت عشان متفضلش حصة بدون عدّاد (وإلا الحفظ التاني بيرجع لـ 1)
      await (svc ?? supabase).from('attendance').delete().eq('id', row.id)
      return { error: `تعذّر تحديث عدّاد الطالب: ${upErr} — لم يتم حفظ الحصة، حاول مرة أخرى` }
    }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'session_report',
    entity_type: 'student',
    entity_id: data.student_id,
    details: {
      attendance_id: row.id,
      status: data.status,
      session_num: nextSession,
      date: today,
      package_complete: completedPackage,
      package_size: quota,
    },
  })

  revalidateTeacherPaths()
  revalidatePath('/supervisor')
  revalidatePath('/admin/finance')
  return {
    success: true,
    data: row,
    next_session_num: isPresent ? nextSession : null,
    message: isPresent
      ? `اتسجل حضور — حصة رقم ${nextSession}${quota > 0 ? ` من ${quota}` : ''}${dueMsg}`
      : 'اتسجل الغياب مع التقرير',
  }
}

export async function bulkAttendance(
  items: { student_id: string; status: string; teacher_id?: string | null }[]
) {
  const results = []
  for (const item of items) {
    results.push(await recordAttendance(item))
  }
  return results
}

/** حذف حصة المعلم — بيمسح الصف من القاعدة ويظبط العدّاد عند الجميع */
export async function deleteMySession(attendanceId: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    if (!/^[0-9a-f-]{36}$/i.test(attendanceId)) return { error: 'معرّف غير صالح' }

    const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
    if (!teacher) return { error: 'لا يوجد ملف معلم مرتبط بحسابك' }

    const sb = serviceClient()
    const { data: row, error: fetchErr } = await sb
      .from('attendance')
      .select('id, student_id, teacher_id, status, session_num, notes, session_date')
      .eq('id', attendanceId)
      .maybeSingle()
    if (fetchErr) return { error: fetchErr.message }
    if (!row) return { error: 'الحصة غير موجودة أو اتحذفت قبل كده' }
    if (row.teacher_id !== teacher.id) return { error: 'الحصة دي مش بتاعتك' }

    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'teacher_delete_session',
      entity_type: 'attendance',
      entity_id: attendanceId,
      details: {
        student_id: row.student_id,
        status: row.status,
        session_num: row.session_num,
        session_date: row.session_date,
        report: row.notes,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', attendanceId)
    if (error) return { error: `فشل الحذف: ${error.message}` }

    let lastSessionNum: number | null = null
    if (row.student_id) {
      lastSessionNum = await syncStudentLastSession(sb, row.student_id)
    }

    revalidateTeacherPaths()
    return {
      success: true,
      message: 'اتحذفت الحصة من عند الجميع واتظبط عدّاد الطالب',
      last_session_num: lastSessionNum,
      deleted_id: attendanceId,
    }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع أثناء الحذف' }
  }
}

/** تعديل حصة المعلم: الحالة + رقم الحصة + المدة + التقرير */
export async function updateMySession(
  attendanceId: string,
  patch: {
    status?: string
    session_num?: number | null
    session_duration?: number | null
    notes?: string | null
  }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    if (!/^[0-9a-f-]{36}$/i.test(attendanceId)) return { error: 'معرّف غير صالح' }

    const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
    if (!teacher) return { error: 'لا يوجد ملف معلم مرتبط بحسابك' }

    const sb = serviceClient()
    const { data: row } = await sb
      .from('attendance')
      .select('id, teacher_id, student_id, status')
      .eq('id', attendanceId)
      .maybeSingle()
    if (!row) return { error: 'الحصة غير موجودة' }
    if (row.teacher_id !== teacher.id) return { error: 'الحصة دي مش بتاعتك' }

    const update: Record<string, unknown> = {}
    if (patch.status) {
      const allowed = ['حاضر', 'غائب', 'متأخر', 'معذور']
      if (!allowed.includes(patch.status)) return { error: 'حالة غير صالحة' }
      update.status = patch.status
    }
    if (patch.session_num !== undefined) {
      const n = Number(patch.session_num)
      const rounded = Number.isFinite(n) && n >= 0 ? Math.round(n) : null
      if (rounded != null && row.student_id) {
        const { data: st } = await sb
          .from('students')
          .select('monthly_sessions, subscription_type')
          .eq('id', row.student_id)
          .maybeSingle()
        const quota = packageSize(st || {})
        const check = validateSessionWithinPackage(rounded, quota)
        if (!check.ok) return { error: check.error }
      }
      update.session_num = rounded
    }
    if (patch.session_duration !== undefined) {
      const d = Number(patch.session_duration)
      update.session_duration = Number.isFinite(d) && d >= 5 && d <= 300 ? Math.round(d) : null
    }
    if (patch.notes !== undefined) {
      const t = String(patch.notes || '').trim()
      update.notes = t ? t.slice(0, 4000) : null
    }
    if (Object.keys(update).length === 0) return { error: 'مفيش تعديل' }

    const { error } = await sb.from('attendance').update(update).eq('id', attendanceId)
    if (error) return { error: error.message }

    let lastSessionNum: number | null = null
    if (row.student_id) {
      lastSessionNum = await syncStudentLastSession(sb, row.student_id)
    }

    await supabase.from('activity_log').insert({
      actor_id: user.id,
      action: 'teacher_update_session',
      entity_type: 'attendance',
      entity_id: attendanceId,
      details: update,
    })

    revalidateTeacherPaths()
    return { success: true, message: 'تم تعديل الحصة عند الجميع', last_session_num: lastSessionNum }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع' }
  }
}

export async function updateSessionReport(attendanceId: string, text: string) {
  return updateMySession(attendanceId, { notes: text })
}
