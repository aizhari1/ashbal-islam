'use server'

import { currentMonthKey, monthLabelAr } from '@/lib/dues'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function canManageSchedule() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return ['admin', 'supervisor'].includes(String(p?.role)) ? supabase : null
}

export async function addFixedSchedule(formData: FormData) {
  const supabase = await canManageSchedule()
  if (!supabase) return { error: 'للإدارة والإشراف فقط' }
  const student_id = String(formData.get('student_id') || '') || null
  const teacher_id = String(formData.get('teacher_id') || '') || null
  const day_of_week = Number(formData.get('day_of_week') || 0)
  const start_time = String(formData.get('start_time') || '') || null
  const duration_minutes = Number(formData.get('duration_minutes') || 30)
  const zoom = String(formData.get('zoom_link') || '').trim()
  const notesBase = String(formData.get('notes') || '').trim()
  const notes = zoom ? `${notesBase}${notesBase ? ' | ' : ''}ZOOM=${zoom}` : notesBase || null

  if (day_of_week < 0 || day_of_week > 6) {
    return { error: 'اختر يوم الأسبوع' }
  }

  const { error } = await supabase.from('schedule_entries').insert({
    student_id,
    teacher_id,
    day_of_week,
    start_time,
    duration_minutes,
    status: 'مجدول',
    notes,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/teacher/schedule')
  return { success: true }
}

export async function deleteFixedSchedule(formData: FormData) {
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const supabase = await canManageSchedule()
  if (!supabase) return { error: 'للإدارة والإشراف فقط' }
  const { error } = await supabase.from('schedule_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/teacher/schedule')
  return { success: true }
}

export async function updateFixedSchedule(formData: FormData) {
  const supabase = await canManageSchedule()
  if (!supabase) return { error: 'للإدارة والإشراف فقط' }
  const id = String(formData.get('id') || '')
  if (!id) return { error: 'معرّف ناقص' }
  const day_of_week = Number(formData.get('day_of_week'))
  if (!(day_of_week >= 0 && day_of_week <= 6)) return { error: 'اختر يوم الأسبوع' }
  const zoom = String(formData.get('zoom_link') || '').trim()
  const notesBase = String(formData.get('notes') || '').trim()
  const patch: Record<string, unknown> = {
    day_of_week,
    start_time: String(formData.get('start_time') || '') || null,
    duration_minutes: Number(formData.get('duration_minutes') || 30) || 30,
    notes: zoom ? `${notesBase}${notesBase ? ' | ' : ''}ZOOM=${zoom}` : notesBase || null,
  }
  const teacher_id = String(formData.get('teacher_id') || '')
  if (teacher_id) patch.teacher_id = teacher_id
  const { error } = await supabase.from('schedule_entries').update(patch).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/teacher/schedule')
  return { success: true }
}

/**
 * نسخ مواعيد شهر إلى شهر آخر (افتراضي: أكتوبر → نوفمبر 2026)
 * - المواعيد الأسبوعية (day_of_week بدون تاريخ): تتأكد إنها موجودة كقالب ثابت
 * - المواعيد بتاريخ أكتوبر: تُنسخ لتاريخ مقابل في نوفمبر
 */
export async function copyScheduleMonth(formData?: FormData) {
  const supabase = await canManageSchedule()
  if (!supabase) return { error: 'للإدارة والإشراف فقط' }

  const fromMonth = String(formData?.get('from_month') || '2026-10')
  const toMonth = String(formData?.get('to_month') || '2026-11')

  const [fy, fm] = fromMonth.split('-').map(Number)
  const [ty, tm] = toMonth.split('-').map(Number)
  if (!fy || !fm || !ty || !tm) return { error: 'شهور غير صالحة' }

  const fromStart = `${fromMonth}-01`
  const fromLast = new Date(fy, fm, 0).getDate()
  const fromEnd = `${fromMonth}-${String(fromLast).padStart(2, '0')}`
  const toLast = new Date(ty, tm, 0).getDate()

  // كل المواعيد (أسبوعي + بتاريخ)
  const all: any[] = []
  let off = 0
  while (true) {
    const { data: chunk } = await supabase
      .from('schedule_entries')
      .select('id, student_id, teacher_id, day_of_week, start_time, duration_minutes, session_date, status, notes')
      .range(off, off + 999)
    if (!chunk?.length) break
    all.push(...chunk)
    if (chunk.length < 1000) break
    off += 1000
    if (off > 20000) break
  }

  // مواعيد الهدف الموجودة عشان ما نكررش
  const toStart = `${toMonth}-01`
  const toEnd = `${toMonth}-${String(toLast).padStart(2, '0')}`
  const { data: existingTo } = await supabase
    .from('schedule_entries')
    .select('student_id, teacher_id, start_time, session_date, day_of_week')
    .or(`and(session_date.gte.${toStart},session_date.lte.${toEnd}),session_date.is.null`)
    .limit(5000)

  const existsKey = new Set(
    (existingTo ?? []).map(
      (e) =>
        `${e.student_id || ''}|${e.teacher_id || ''}|${String(e.start_time || '').slice(0, 5)}|${e.session_date || ''}|${e.day_of_week ?? ''}`
    )
  )

  const toInsert: any[] = []
  let weeklyFixed = 0
  let datedCopied = 0

  for (const e of all) {
    const time = String(e.start_time || '').slice(0, 8) || null
    const timeKey = String(e.start_time || '').slice(0, 5)

    // 1) قالب أسبوعي بدون تاريخ → يبقى كما هو (ثابت كل الشهور)
    if (!e.session_date && e.day_of_week != null) {
      weeklyFixed += 1
      continue
    }

    // 2) موعد بتاريخ في شهر المصدر → نسخة في شهر الهدف
    if (e.session_date) {
      const d = String(e.session_date).slice(0, 10)
      if (d < fromStart || d > fromEnd) continue
      const dayNum = Number(d.slice(8, 10))
      const targetDay = Math.min(dayNum, toLast)
      const newDate = `${toMonth}-${String(targetDay).padStart(2, '0')}`
      // day_of_week من التاريخ الجديد
      const dow = new Date(`${newDate}T12:00:00`).getDay()

      const key = `${e.student_id || ''}|${e.teacher_id || ''}|${timeKey}|${newDate}|${dow}`
      if (existsKey.has(key)) continue

      toInsert.push({
        student_id: e.student_id,
        teacher_id: e.teacher_id,
        day_of_week: e.day_of_week != null ? e.day_of_week : dow,
        start_time: time,
        duration_minutes: e.duration_minutes || 30,
        session_date: newDate,
        status: e.status || 'مجدول',
        notes: e.notes,
      })
      existsKey.add(key)
      datedCopied += 1
      continue
    }

    // 3) لو فيه day_of_week بس كان مربوط بأكتوبر بشكل غريب — تجاهل
  }

  // إدراج على دفعات
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 200) {
    const batch = toInsert.slice(i, i + 200)
    const { error, data } = await supabase.from('schedule_entries').insert(batch).select('id')
    if (error) return { error: error.message, inserted, weeklyFixed, datedCopied }
    inserted += data?.length || batch.length
  }

  // تأكد إن المواعيد الأسبوعية من أكتوبر (بتاريخ) ليها أيضًا قالب day_of_week دائم
  // لأي صف أكتوبر: لو day_of_week فاضي نملأه
  for (const e of all) {
    if (!e.session_date) continue
    const d = String(e.session_date).slice(0, 10)
    if (d < fromStart || d > fromEnd) continue
    if (e.day_of_week != null) continue
    const dow = new Date(`${d}T12:00:00`).getDay()
    await supabase.from('schedule_entries').update({ day_of_week: dow }).eq('id', e.id)
  }

  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/teacher/schedule')
  revalidatePath('/supervisor')
  revalidatePath('/admin')

  return {
    success: true,
    fromMonth,
    toMonth,
    weekly_templates: weeklyFixed,
    dated_copied: datedCopied,
    inserted,
    message: `تم: ${inserted} موعد منسوخ من ${fromMonth} إلى ${toMonth} · قوالب أسبوعية ثابتة: ${weeklyFixed}`,
  }
}

export async function addSupervisorEval(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const teacher_id = String(formData.get('teacher_id') || '')
  const teacher_name = String(formData.get('teacher_name') || '')
  const points = Number(formData.get('points') || 0)
  const notes = String(formData.get('notes') || '')
  if (!teacher_id) return { error: 'اختر معلماً' }

  const { error } = await supabase.from('activity_log').insert({
    actor_id: user?.id,
    action: 'supervisor_eval',
    entity_type: 'teacher',
    entity_id: teacher_id,
    details: {
      teacher_name,
      points,
      notes,
      month: monthLabelAr(currentMonthKey()),
    },
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/supervisor-eval')
  return { success: true }
}
