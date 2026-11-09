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
  revalidatePath('/admin/today')
  return { success: true }
}

/** إضافة عدة أيام لنفس الطالب/المعلم/الوقت دفعة واحدة */
export async function addBulkFixedSchedule(formData: FormData) {
  const supabase = await canManageSchedule()
  if (!supabase) return { error: 'للإدارة والإشراف فقط' }
  const student_id = String(formData.get('student_id') || '') || null
  const teacher_id = String(formData.get('teacher_id') || '') || null
  const start_time = String(formData.get('start_time') || '') || null
  const duration_minutes = Number(formData.get('duration_minutes') || 30)
  const zoom = String(formData.get('zoom_link') || '').trim()
  const notesBase = String(formData.get('notes') || '').trim()
  const notes = zoom ? `${notesBase}${notesBase ? ' | ' : ''}ZOOM=${zoom}` : notesBase || null

  if (!student_id) return { error: 'اختَر الطالب' }
  if (!teacher_id) return { error: 'اختَر المعلم' }
  if (!start_time) return { error: 'اختَر الوقت' }

  const daysRaw = formData.getAll('day_of_week')
  const days = [...new Set(daysRaw.map((d) => Number(d)).filter((d) => d >= 0 && d <= 6))]
  if (days.length === 0) return { error: 'اختَر يوم واحد على الأقل' }

  const rows = days.map((day_of_week) => ({
    student_id,
    teacher_id,
    day_of_week,
    start_time,
    duration_minutes,
    status: 'مجدول',
    notes,
  }))

  const { error } = await supabase.from('schedule_entries').insert(rows)
  if (error) return { error: error.message }
  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/admin/today')
  revalidatePath('/teacher/schedule')
  return { success: true, message: `تم إضافة ${rows.length} موعد` }
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
  revalidatePath('/admin/today')
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
  revalidatePath('/admin/today')
  return { success: true }
}

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

  const targetDated = all.filter((e) => e.session_date && String(e.session_date).startsWith(toMonth))
  const targetKeys = new Set(
    targetDated.map(
      (e) => `${e.student_id}|${e.teacher_id}|${e.session_date}|${e.start_time}`
    )
  )

  const fromDated = all.filter(
    (e) => e.session_date && String(e.session_date) >= fromStart && String(e.session_date) <= fromEnd
  )

  const toInsert: any[] = []
  for (const e of fromDated) {
    const day = Number(String(e.session_date).slice(8, 10))
    const newDay = Math.min(day, toLast)
    const newDate = `${toMonth}-${String(newDay).padStart(2, '0')}`
    const key = `${e.student_id}|${e.teacher_id}|${newDate}|${e.start_time}`
    if (targetKeys.has(key)) continue
    toInsert.push({
      student_id: e.student_id,
      teacher_id: e.teacher_id,
      day_of_week: e.day_of_week,
      start_time: e.start_time,
      duration_minutes: e.duration_minutes,
      session_date: newDate,
      status: e.status || 'مجدول',
      notes: e.notes,
    })
    targetKeys.add(key)
  }

  if (toInsert.length) {
    const { error } = await supabase.from('schedule_entries').insert(toInsert)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/fixed-schedule')
  revalidatePath('/admin/today')
  return {
    success: true,
    message: `اتنسخ ${toInsert.length} موعد من ${fromMonth} إلى ${toMonth}`,
  }
}

export async function addSupervisorEval(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مسجل' }
  const teacher_id = String(formData.get('teacher_id') || '')
  const score = Number(formData.get('score') || 0)
  const notes = String(formData.get('notes') || '') || null
  if (!teacher_id) return { error: 'اختر المعلم' }
  const { error } = await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'supervisor_eval',
    entity_type: 'teacher',
    entity_id: teacher_id,
    details: { score, notes, month: currentMonthKey() },
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/supervisor-eval')
  return { success: true }
}
