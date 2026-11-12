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

function isAdminFabricatedNote(notes: string | null | undefined): boolean {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
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
    const attNum = Math.max(0, Number(last.session_num) || 0)
    const lastDate = String(last.session_date || '').slice(0, 10)
    const counterDate = student?.last_session_date ? String(student.last_session_date).slice(0, 10) : ''
    if (counterDate && lastDate && counterDate >= lastDate && stored >= attNum) {
      return stored
    }
    if (attNum > stored) return attNum
    if (attNum === stored && lastDate && (!counterDate || lastDate > counterDate)) {
      return attNum
    }
  } catch {
    /* stored */
  }
  return stored
}

async function maxSessionBefore(
  client: Svc | Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  beforeDate: string,
  storedCounter: number
): Promise<number> {
  let maxAtt = 0
  try {
    const { data } = await client
      .from('attendance')
      .select('session_num')
      .eq('student_id', studentId)
      .lt('session_date', beforeDate)
      .in('status', ['حاضر', 'متأخر'])
      .not('session_num', 'is', null)
      .order('session_num', { ascending: false })
      .limit(1)
    maxAtt = Number(data?.[0]?.session_num) || 0
  } catch {
    maxAtt = 0
  }
  return Math.max(0, storedCounter, maxAtt)
}

async function todaySessionNum(
  client: Svc | Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  rowNum: number | null | undefined,
  today: string,
  studentHint?: {
    last_session_num?: number | null
    last_session_date?: string | null
    monthly_sessions?: number | null
    subscription_type?: string | null
  } | null
): Promise<number | null> {
  const row = Number(rowNum) > 0 ? Number(rowNum) : null
  try {
    let st = studentHint
    if (!st) {
      const { data } = await client
        .from('students')
        .select('last_session_num, last_session_date, monthly_sessions, subscription_type')
        .eq('id', studentId)
        .maybeSingle()
      st = data
    }
    const stored = Number(st?.last_session_num) || 0
    const d = st?.last_session_date ? String(st.last_session_date).slice(0, 10) : ''
    const quota = packageSize(st || {})
    const baseBefore = await maxSessionBefore(client, studentId, today, d === today ? 0 : stored)
    const base = d === today ? Math.max(baseBefore, 0) : Math.max(baseBefore, stored)
    const expectedNew = nextPackageSessionNum(base, quota).next

    if (d === today && stored > 0) {
      if (stored < expectedNew) return expectedNew
      return stored
    }

    if (expectedNew > 0) {
      if (row == null || row < expectedNew) return expectedNew
      return row
    }
  } catch {
    /* نرجع لرقم الصف */
  }
  return row
}

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
  const storedNum = Math.max(0, Number(student?.last_session_num) || 0)
  const prevFromAtt = await resolvePrevCounter(sb, studentId, student)
  const prevNum = await maxSessionBefore(sb ?? userClient, studentId, today, Math.max(storedNum, prevFromAtt))
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
    t && n != null && n !== undefined
      ? t.replace(/رقم الحلقة:\s*\d+/g, `رقم الحلقة: ${n}`)
      : t || null

  const svcLookup = tryServiceClient()
  const lookupClient = svcLookup ?? supabase
  const { data: existingRowsRaw } = await lookupClient
    .from('attendance')
    .select('id, session_num, status, teacher_id, created_at, notes')
    .eq('student_id', data.student_id)
    .eq('session_date', today)
    .order('created_at', { ascending: false })
    .limit(20)

  // حصص التسوية الإدارية لا تُعتبر تقرير معلم النهارده
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

    if (willBePresent && wasPresent && sessionNum != null && Number(sessionNum) > 0) {
      sessionNum = (await todaySessionNum(lookupClient, data.student_id, sessionNum, today)) ?? sessionNum
    }

    if (willBePresent && (sessionNum == null || sessionNum === undefined || Number(sessionNum) <= 0)) {
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
        notes: willBePresent
          ? withNum(data.report_text || data.notes, sessionNum != null ? Number(sessionNum) : null)
          : data.report_text || data.notes || null,
        session_num: willBePresent ? sessionNum : existing[0].session_num,
        teacher_id: teacherId || existing[0].teacher_id,
        ...details,
      })
      .eq('id', existing[0].id)
      .select()
      .single()
    if (error) return { error: error.message }

    if (existing.length > 1 && svcLookup) {
      const dupIds = existing.slice(1).map((r: { id: string }) => r.id)
      await svcLookup.from('attendance').delete().in('id', dupIds)
    }

    if (willBePresent && sessionNum != null && Number(sessionNum) > 0) {
      // لا ننزل بالعدّاد أبدًا عند تعديل تقرير النهارده
      const { data: curSt } = await (svcLookup ?? supabase)
        .from('students')
        .select('last_session_num')
        .eq('id', data.student_id)
        .maybeSingle()
      const curNum = Math.max(0, Number(curSt?.last_session_num) || 0)
      const finalNum = Math.max(curNum, Number(sessionNum))
      await writeStudentPatch(svcLookup, supabase, data.student_id, {
        last_session_num: finalNum,
        last_session_date: today,
      })
      sessionNum = finalNum
    }

    revalidateTeacherPaths()
    return {
      success: true,
      data: row,
      next_session_num: willBePresent ? Number(sessionNum) || null : null,
      message: !wasPresent && willBePresent
        ? `اتحدّث لتسجيل حضور — حصة رقم ${sessionNum}${dueMsg}`
        : willBePresent
          ? `اتحدّث تقرير اليوم — حصة رقم ${sessionNum}`
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
  const storedNum = Math.max(0, Number(student?.last_session_num) || 0)
  const prevFromAtt = await resolvePrevCounter(svc, data.student_id, student)
  const prevNum = await maxSessionBefore(svc ?? supabase, data.student_id, today, Math.max(storedNum, prevFromAtt))
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
    ;(row as any).teacher_id = teacherId
  }

  if (svc && isPresent) {
    const { data: sameDay } = await svc
      .from('attendance')
      .select('id, notes')
      .eq('student_id', data.student_id)
      .eq('session_date', today)
      .neq('id', row.id)
    const toDelete = (sameDay || [])
      .filter((r: any) => !isAdminFabricatedNote(r.notes))
      .map((r: { id: string }) => r.id)
    if (toDelete.length > 0) {
      await svc.from('attendance').delete().in('id', toDelete)
    }
  }

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
        patch.amount_due = prevDue > 0 ? prevDue + due : due
        dueMsg = ` · مستحق ${patch.amount_due} ج · الباقة خلصت ويبدأ العد من 1`
      } else {
        dueMsg = ' · الباقة خلصت ويبدأ العد من 1'
      }
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

export async function getSessionPreview(studentId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  const { data: todayRows } = await sb
    .from('attendance')
    .select('session_num, status, notes')
    .eq('student_id', studentId)
    .eq('session_date', today)
    .limit(20)
  const presentRow = (todayRows || []).find(
    (r: any) => isPresentStatus(r.status || '') && r.session_num && !isAdminFabricatedNote(r.notes)
  )

  if (presentRow) {
    const n =
      (await todaySessionNum(sb, studentId, Number(presentRow.session_num), today, student)) ??
      Number(presentRow.session_num)
    return { sessionNum: n, quota, alreadyToday: true }
  }

  const base = await maxSessionBefore(sb, studentId, today, stored)
  const next = nextPackageSessionNum(base, quota).next
  return { sessionNum: next, quota, alreadyToday: false }
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
      update.session_duration =
        patch.session_duration === null || !Number.isFinite(d)
          ? null
          : Math.min(300, Math.max(5, Math.round(d)))
    }
    if (patch.notes !== undefined) {
      update.notes = patch.notes
    }
    if (Object.keys(update).length === 0) return { error: 'لا يوجد تعديل' }

    const { error } = await sb.from('attendance').update(update).eq('id', attendanceId)
    if (error) return { error: error.message }

    let lastSessionNum: number | null = null
    if (row.student_id && (patch.status !== undefined || patch.session_num !== undefined)) {
      lastSessionNum = await syncStudentLastSession(sb, row.student_id)
    }

    revalidateTeacherPaths()
    return {
      success: true,
      message: 'تم تعديل الحصة عند الجميع',
      last_session_num: lastSessionNum,
    }
  } catch (e: any) {
    return { error: e?.message || 'خطأ غير متوقع أثناء التعديل' }
  }
}
