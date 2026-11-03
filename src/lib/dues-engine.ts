/**
 * مصدر واحد لحساب المستحقات (Backend فقط).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeDueReminders,
  type LastPay,
  type ReminderRow,
  type ReminderStudent,
} from './reminder-logic'

const PAGE = 1000
const STUDENT_COLS =
  'id, code, name, phone, status, subscription_type, monthly_sessions, amount_due, last_session_num, last_session_date, price_per_session, teachers(name)'

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAll<T>(build: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export function buildLastPay(
  pays: { student_id: string | null; payment_date: string | null; due_after?: number | null }[]
): Record<string, LastPay> {
  const lastPay: Record<string, LastPay> = {}
  for (const p of pays) {
    if (!p.student_id || !p.payment_date) continue
    if (lastPay[p.student_id]) continue
    lastPay[p.student_id] = {
      day: String(p.payment_date).slice(0, 10),
      months: 1,
      residual: Number(p.due_after) > 0 ? Number(p.due_after) : 0,
    }
  }
  return lastPay
}

export function buildAttendanceDays(
  att: { student_id: string | null; session_date: string | null }[]
): Record<string, string[]> {
  const attDays: Record<string, string[]> = {}
  const seen: Record<string, true> = {}
  for (const a of att) {
    if (!a.student_id || !a.session_date) continue
    const day = String(a.session_date).slice(0, 10)
    const k = a.student_id + '|' + day
    if (seen[k]) continue
    seen[k] = true
    ;(attDays[a.student_id] = attDays[a.student_id] || []).push(day)
  }
  for (const id of Object.keys(attDays)) attDays[id].sort()
  return attDays
}

type DuesInputs = {
  students: ReminderStudent[]
  lastPay: Record<string, LastPay>
  attDays: Record<string, string[]>
}

export async function loadDuesInputs(supabase: SupabaseClient): Promise<DuesInputs> {
  const rawStudents = await fetchAll<any>((from, to) =>
    supabase.from('students').select(STUDENT_COLS).order('id').range(from, to)
  )

  const students: ReminderStudent[] = rawStudents.map((s: any) => ({
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

  let pays: any[]
  try {
    pays = await fetchAll<any>((from, to) =>
      supabase
        .from('payments')
        .select('id, student_id, payment_date, amount, due_after, created_at')
        .gt('amount', 0)
        .order('payment_date', { ascending: false })
        .range(from, to)
    )
  } catch {
    pays = await fetchAll<any>((from, to) =>
      supabase
        .from('payments')
        .select('id, student_id, payment_date, amount, created_at')
        .gt('amount', 0)
        .order('payment_date', { ascending: false })
        .range(from, to)
    )
  }

  const att = await fetchAll<any>((from, to) =>
    supabase
      .from('attendance')
      .select('student_id, session_date, status')
      .in('status', ['حاضر', 'متأخر'])
      .order('session_date', { ascending: true })
      .range(from, to)
  )

  return {
    students,
    lastPay: buildLastPay(pays),
    attDays: buildAttendanceDays(att),
  }
}

export async function computeAndSyncDues(supabase: SupabaseClient): Promise<{
  count: number
  total: number
  updated: number
  rows: ReminderRow[]
}> {
  const { students, lastPay, attDays } = await loadDuesInputs(supabase)
  const dueList = computeDueReminders(students, lastPay, attDays)
  const dueById: Record<string, number> = {}
  for (const s of students) dueById[s.id] = 0
  for (const r of dueList) dueById[r.id] = r.outstanding

  let updated = 0
  for (const [id, due] of Object.entries(dueById)) {
    const prev = students.find((s) => s.id === id)?.amount_due ?? 0
    if (Number(prev) === Number(due)) continue
    const { error } = await supabase.from('students').update({ amount_due: due }).eq('id', id)
    if (!error) updated++
  }

  const total = dueList.reduce((s, r) => s + r.outstanding, 0)
  return { count: dueList.length, total, updated, rows: dueList }
}

export async function getDuesSummary(supabase: SupabaseClient): Promise<{
  count: number
  total: number
  rows: ReminderRow[]
}> {
  const { students, lastPay, attDays } = await loadDuesInputs(supabase)
  const dueList = computeDueReminders(students, lastPay, attDays)
  const total = dueList.reduce((s, r) => s + r.outstanding, 0)
  return { count: dueList.length, total, rows: dueList }
}
