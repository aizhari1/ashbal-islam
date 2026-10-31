'use server'

import { createClient } from '@/lib/supabase/server'
import { computeDueReminders, type ReminderStudent } from '@/lib/reminder-logic'
import { revalidatePath } from 'next/cache'

export async function syncAllStudentDues() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }

  const { data: rawStudents } = await supabase
    .from('students')
    .select(
      'id, code, name, phone, status, subscription_type, monthly_sessions, amount_due, last_session_num, last_session_date, price_per_session, teachers(name)'
    )
    .limit(500)

  const students: ReminderStudent[] = (rawStudents ?? []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    phone: s.phone,
    status: s.status || 'نشط',
    subscription_type: s.subscription_type,
    monthly_sessions: s.monthly_sessions,
    amount_due: Number(s.amount_due || 0),
    last_session_num: s.last_session_num,
    last_session_date: s.last_session_date,
    price_per_session: s.price_per_session,
    teacher_name: s.teachers?.name || '—',
  }))

  const { data: pays } = await supabase
    .from('payments')
    .select('student_id, payment_date, amount')
    .gt('amount', 0)
    .order('payment_date', { ascending: false })
    .limit(3000)

  const lastPay: Record<string, { day: string; months: number }> = {}
  for (const p of pays ?? []) {
    if (!p.student_id || lastPay[p.student_id]) continue
    lastPay[p.student_id] = { day: String(p.payment_date).slice(0, 10), months: 1 }
  }

  const { data: att } = await supabase
    .from('attendance')
    .select('student_id, session_date, status')
    .in('status', ['حاضر', 'متأخر'])
    .limit(8000)

  const attDays: Record<string, string[]> = {}
  const seen: Record<string, true> = {}
  for (const a of att ?? []) {
    if (!a.student_id || !a.session_date) continue
    const day = String(a.session_date).slice(0, 10)
    const k = a.student_id + '|' + day
    if (seen[k]) continue
    seen[k] = true
    ;(attDays[a.student_id] = attDays[a.student_id] || []).push(day)
  }
  for (const id of Object.keys(attDays)) attDays[id].sort()

  const dueList = computeDueReminders(students, lastPay, attDays)
  const dueById: Record<string, number> = {}
  for (const s of students) dueById[s.id] = 0
  for (const r of dueList) dueById[r.id] = r.outstanding

  let updated = 0
  for (const [id, due] of Object.entries(dueById)) {
    const prev = students.find((s) => s.id === id)?.amount_due ?? 0
    if (Math.abs(Number(prev) - due) < 0.01) continue
    const { error } = await supabase.from('students').update({ amount_due: due }).eq('id', id)
    if (!error) updated++
  }

  revalidatePath('/admin')
  revalidatePath('/admin/finance')
  revalidatePath('/admin/students')
  revalidatePath('/supervisor')
  revalidatePath('/admin/monthly')

  return {
    success: true,
    due_count: dueList.length,
    due_total: dueList.reduce((s, r) => s + r.outstanding, 0),
    updated,
  }
}
