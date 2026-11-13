'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { dueAfterPackageComplete, nextPackageSessionNum, packageSize, todayKey } from '@/lib/dues'

const PRESENT_STATUSES = new Set(['حاضر', 'متأخر', 'تم الحضور'])

function normalizeStatus(status: string): string {
  if (status === 'تم الحضور') return 'حاضر'
  if (status === 'لم يحضر') return 'غائب'
  return status
}

function isPresentStatus(status: string): boolean {
  return PRESENT_STATUSES.has(status) || PRESENT_STATUSES.has(normalizeStatus(status))
}

function isAdminFabricatedNote(notes: string | null | undefined): boolean {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
}

type Svc = ReturnType<typeof serviceClient>

function tryServiceClient(): Svc | null {
  try {
    return serviceClient()
  } catch {
    return null
  }
}

async function syncStudentLastSession(sb: Svc, studentId: string): Promise<number> {
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
    .update({ last_session_num: lastNum, last_session_date: last?.session_date || null })
    .eq('id', studentId)
  return lastNum
}

async function maxSessionBefore(
  _client: any,
  _studentId: string,
  _beforeDate: string,
  storedCounter: number
): Promise<number> {
  return Math.max(0, Number(storedCounter) || 0)
}

async function writeStudentPatch(
  sb: Svc | null,
  userClient: any,
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

async function advanceStudentCounter(
  sb: Svc | null,
  userClient: any,
  studentId: string,
  today: string
): Promise<{ nextSession: number; completedPackage: boolean; dueMsg: string; error?: string }> {
  const { data: student } = await (sb ?? userClient)
    .from('students')
    .select('last_session_num, last_session_date, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', studentId)
    .single()
  const quota = packageSize(student || {})
  const storedNum = Math.max(0, Number(student?.last_session_num) || 0)
  const { next: nextSession, completedPackage } = nextPackageSessionNum(storedNum, quota)
  const patch: Record<string, unknown> = { last_session_date: today, last_session_num: nextSession }
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
  for (const path of [
    '/teacher', '/teacher/session', '/teacher/attendance', '/teacher/dues', '/teacher/students',
    '/admin', '/admin/attended', '/admin/sessions-detail', '/admin/payroll', '/admin/students',
    '/admin/edit-session', '/admin/session-settle', '/supervisor', '/supervisor/edit-student', '/supervisor/edit-session',
  ]) revalidatePath(path)
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const today = todayKey()
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(prof?.role || '')
  if (!['teacher', 'supervisor', 'admin'].includes(role)) return { error: 'غير مصرح' }

  let teacherId: string | null = data.teacher_id || null
  if (role === 'teacher') {
    const { data: me } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
    if (!me?.id) return { error: 'لا يوجد ملف معلم مرتبط بحسابك' }
    teacherId = me.id
  }
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
    t && n != null ? t.replace(/رقم الحلقة:\s*\d+/g, `رقم الحلقة: ${n}`) : t || null

  const svcLookup = tryServiceClient()
  const lookupClient = svcLookup ?? supabase
  const { data: existingRowsRaw } = await lookupClient
    .from('attendance')
    .select('id, session_num, status, teacher_id, created_at, notes')
    .eq('student_id', data.student_id)
    .eq('session_date', today)
    .order('created_at', { ascending: false })
    .limit(20)
  const existingRows = (existingRowsRaw || []).filter((r: any) => !isAdminFabricatedNote(r.notes))
  const existing = existingRows.length > 0 ? existingRows : null

  if (existing && existing.length > 0) {
    const prevStatus = existing[0].status || ''
    const wasPresent = isPresentStatus(prevStatus)
    const willBePresent = isPresentStatus(data.status)
    const normStatus = normalizeStatus(data.status)
    let sessionNum = existing[0].session_num
    let dueMsg = ''
    if (!wasPresent && willBePresent) {
      const adv = await advanceStudentCounter(svcLookup, supabase, data.student_id, today)
      if (adv.error) return { error: `تعذّر تحديث عدّاد الطالب: ${adv.error} — لم يتم الحفظ، حاول مرة أخرى` }
      sessionNum = adv.nextSession
      dueMsg = adv.dueMsg
    }
    if (willBePresent && (sessionNum == null || Number(sessionNum) <= 0)) {
      const adv = await advanceStudentCounter(svcLookup, supabase, data.student_id, today)
      if (adv.error) return { error: `تعذّر تحديث عدّاد الطالب: ${adv.error} — لم يتم الحفظ، حاول مرة أخرى` }
      sessionNum = adv.nextSession
      dueMsg = adv.dueMsg
    }
    const writeClient = svcLookup ?? supabase
    const { data: row, error } = await writeClient
      .from('attendance')
      .update({
        status: normStatus,
        hifz_from: data.hifz_from || null,
        hifz_to: data.hifz_to || null,
        muraja_from: data.muraja_from || null,
        muraja_to: data.muraja_to || null,
        tajweed_notes: data.tajweed_notes || null,
        rating: data.rating || null,
        notes: willBePresent ? withNum(data.report_text || data.notes, sessionNum != null ? Number(sessionNum) : null) : data.report_text || data.notes || null,
        session_num: willBePresent ? sessionNum : existing[0].session_num,
        teacher_id: teacherId || existing[0].teacher_id,
        ...details,
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return { error: error.message }
    if (existing.length > 1 && svcLookup) {
      await svcLookup.from('attendance').delete().in('id', existing.slice(1).map((r: any) => r.id))
    }
    if (willBePresent && sessionNum != null && Number(sessionNum) > 0) {
      const { data: curSt } = await (svcLookup ?? supabase).from('students').select('last_session_num').eq('id', data.student_id).maybeSingle()
      const finalNum = Math.max(Math.max(0, Number(curSt?.last_session_num) || 0), Number(sessionNum))
      await writeStudentPatch(svcLookup, supabase, data.student_id, { last_session_num: finalNum, last_session_date: today })
      sessionNum = finalNum
    }
    revalidateTeacherPaths()
    return {
      success: true,
      data: row,
      next_session_num: willBePresent ? Number(sessionNum) || null : null,
      message: !wasPresent && willBePresent ? `اتحدّث لتسجيل حضور — حصة رقم ${sessionNum}${dueMsg}` : willBePresent ? `اتحدّث تقرير اليوم — حصة رقم ${sessionNum}` : 'اتحدّث تقرير اليوم',
    }
  }

  const { data: student } = await supabase
    .from('students')
    .select('last_session_num, last_session_date, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', data.student_id)
    .single()
  const svc = tryServiceClient()
  const quota = packageSize(student || {})
  const storedNum = Math.max(0, Number(student?.last_session_num) || 0)
  const prevNum = await maxSessionBefore(svc ?? supabase, data.student_id, today, storedNum)
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

  if (teacherId && row && (row as any).teacher_id !== teacherId && svc) {
    await svc.from('attendance').update({ teacher_id: teacherId }).eq('id', row.id)
  }
  if (svc && isPresent) {
    const { data: sameDay } = await svc.from('attendance').select('id, notes').eq('student_id', data.student_id).eq('session_date', today).neq('id', row.id)
    const toDelete = (sameDay || []).filter((r: any) => !isAdminFabricatedNote(r.notes)).map((r: any) => r.id)
    if (toDelete.length) await svc.from('attendance').delete().in('id', toDelete)
  }

  let dueMsg = ''
  if (student && isPresent) {
    const patch: Record<string, unknown> = { last_session_date: today, last_session_num: nextSession }
    if (completedPackage) {
      const due = dueAfterPackageComplete(student)
      if (due > 0) {
        const prevDue = Number(student.amount_due || 0)
        patch.amount_due = prevDue > 0 ? prevDue + due : due
        dueMsg = ` · مستحق ${patch.amount_due} ج · الباقة خلصت ويبدأ العد من 1`
      } else dueMsg = ' · الباقة خلصت ويبدأ العد من 1'
    }
    const upErr = await writeStudentPatch(svc, supabase, data.student_id, patch)
    if (upErr) {
      await (svc ?? supabase).from('attendance').delete().eq('id', row.id)
      return { error: `تعذّر تحديث عدّاد الطالب: ${upErr} — لم يتم حفظ الحصة، حاول مرة أخرى` }
    }
  }

  await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'session_report',
    entity_type: 'student',
    entity_id: data.student_id,
    details: { attendance_id: row.id, status: data.status, session_num: nextSession, date: today, package_complete: completedPackage, package_size: quota },
  })
  revalidateTeacherPaths()
  return {
    success: true,
    data: row,
    next_session_num: isPresent ? nextSession : null,
    message: isPresent ? `اتسجل حضور — حصة رقم ${nextSession}${quota > 0 ? ` من ${quota}` : ''}${dueMsg}` : 'اتسجل الغياب مع التقرير',
  }
}

export async function getSessionPreview(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const svc = tryServiceClient()
  const sb = svc ?? supabase
  const { data: student } = await sb
    .from('students')
    .select('last_session_num, last_session_date, monthly_sessions, subscription_type, price_per_session, amount_due')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) return { error: 'الطالب غير موجود' }
  const quota = packageSize(student)
  const today = todayKey()
  const stored = Math.max(0, Number(student.last_session_num) || 0)
  const { data: todayRowsRaw } = await sb
    .from('attendance')
    .select('id, session_num, status, notes')
    .eq('student_id', studentId)
    .eq('session_date', today)
    .order('created_at', { ascending: false })
    .limit(10)
  const todayRows = (todayRowsRaw || []).filter((r: any) => !isAdminFabricatedNote(r.notes))
  const todayRow = todayRows[0] || null
  const alreadyToday = !!todayRow && isPresentStatus(todayRow.status || '')
  let sessionNum: number
  if (alreadyToday && todayRow?.session_num != null && Number(todayRow.session_num) > 0) {
    sessionNum = Number(todayRow.session_num)
  } else {
    const prev = await maxSessionBefore(sb, studentId, today, stored)
    sessionNum = nextPackageSessionNum(prev, quota).next
  }
  return { sessionNum, alreadyToday, lastSessionNum: stored, quota, today }
}

export async function deleteMySession(attendanceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const svc = tryServiceClient()
  const sb = svc ?? supabase
  const { data: row } = await sb.from('attendance').select('student_id, session_num, status').eq('id', attendanceId).maybeSingle()
  if (!row) return { error: 'الحصة غير موجودة' }
  const { error } = await sb.from('attendance').delete().eq('id', attendanceId)
  if (error) return { error: error.message }
  let lastSessionNum: number | null = null
  if (row.student_id && svc) lastSessionNum = await syncStudentLastSession(svc, row.student_id)
  revalidateTeacherPaths()
  return { success: true, message: 'تم حذف الحصة', last_session_num: lastSessionNum }
}

export async function updateMySession(
  attendanceId: string,
  patch: { status?: string; session_num?: number | null; session_duration?: number | null; notes?: string | null }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    const svc = tryServiceClient()
    const sb = svc ?? supabase
    const { data: row } = await sb.from('attendance').select('*').eq('id', attendanceId).maybeSingle()
    if (!row) return { error: 'الحصة غير موجودة' }
    const update: Record<string, unknown> = {}
    if (patch.status !== undefined) update.status = normalizeStatus(patch.status)
    if (patch.session_num !== undefined) update.session_num = patch.session_num == null ? null : Number(patch.session_num)
    if (patch.session_duration !== undefined) {
      const d = Number(patch.session_duration)
      update.session_duration = patch.session_duration === null || !Number.isFinite(d) ? null : Math.min(300, Math.max(5, Math.round(d)))
    }
    if (patch.notes !== undefined) update.notes = patch.notes
    if (Object.keys(update).length === 0) return { error: 'لا يوجد تعديل' }
    const { error } = await sb.from('attendance').update(update).eq('id', attendanceId)
    if (error) return { error: error.message }
    let lastSessionNum: number | null = null
    if (row.student_id && svc && (patch.status !== undefined || patch.session_num !== undefined)) {
      lastSessionNum = await syncStudentLastSession(svc, row.student_id)
    }
    revalidateTeacherPaths()
    return { success: true, message: 'تم تعديل الحصة عند الجميع', last_session_num: lastSessionNum }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع أثناء التعديل' }
  }
}
