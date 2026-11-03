/**
 * مصدر واحد لحساب المستحقات (Backend فقط).
 * لوحتا الإدارة والإشراف تستدعيان نفس الدوال هنا.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeDueReminders,
  type LastPay,
  type ReminderRow,
  type ReminderStudent,
} from './reminder-logic'
import { monthBounds, resolveMonthKey } from './dues'

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

export type DuesResult = {
  dueList: ReminderRow[]
  total: number
  count: number
  updated: number
  students: ReminderStudent[]
}

export async function computeAndSyncDues(
  supabase: SupabaseClient,
  opts: { write?: boolean } = {}
): Promise<DuesResult> {
  const write = opts.write !== false
  const { students, lastPay, attDays } = await loadDuesInputs(supabase)
  const dueList = computeDueReminders(students, lastPay, attDays)

  const dueById: Record<string, number> = {}
  for (const s of students) dueById[s.id] = 0
  for (const r of dueList) dueById[r.id] = r.outstanding

  let updated = 0
  if (write) {
    const changes = students.filter((s) => Math.abs(Number(s.amount_due) - dueById[s.id]) >= 0.01)
    for (let i = 0; i < changes.length; i += 20) {
      const batch = changes.slice(i, i + 20)
      const results = await Promise.all(
        batch.map((s) => supabase.from('students').update({ amount_due: dueById[s.id] }).eq('id', s.id))
      )
      updated += results.filter((r) => !r.error).length
    }
  }

  return {
    dueList,
    total: dueList.reduce((sum, r) => sum + r.outstanding, 0),
    count: dueList.length,
    updated,
    students,
  }
}

export type DuesSummary = {
  monthKey: string
  collected: number
  paymentsCount: number
  dueTotal: number
  dueCount: number
  topDues: { id: string; name: string; code: string; amount_due: number; phone: string | null }[]
}

/** ملخص موحّد: المحصّل حسب الشهر · المستحق رصيد مفتوح الآن */
export async function getDuesSummary(
  supabase: SupabaseClient,
  month?: string | null
): Promise<DuesSummary> {
  const monthKey = resolveMonthKey(month)
  const { start, end } = monthBounds(monthKey)

  const payments = await fetchAll<{ amount: number }>((from, to) =>
    supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date')
      .order('id')
      .range(from, to)
  )

  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0)

  try {
    const dues = await computeAndSyncDues(supabase)
    return {
      monthKey,
      collected,
      paymentsCount: payments.length,
      dueTotal: dues.total,
      dueCount: dues.count,
      topDues: [...dues.dueList]
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 8)
        .map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          amount_due: r.outstanding,
          phone: r.phone,
        })),
    }
  } catch {
    const stored = await fetchAll<any>((from, to) =>
      supabase
        .from('students')
        .select('id, name, code, amount_due, phone')
        .gt('amount_due', 0)
        .order('id')
        .range(from, to)
    )
    return {
      monthKey,
      collected,
      paymentsCount: payments.length,
      dueTotal: stored.reduce((s, d) => s + Number(d.amount_due || 0), 0),
      dueCount: stored.length,
      topDues: [...stored]
        .sort((a, b) => Number(b.amount_due) - Number(a.amount_due))
        .slice(0, 8)
        .map((d) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          amount_due: Number(d.amount_due),
          phone: d.phone,
        })),
    }
  }
}
