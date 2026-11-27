import { currentMonthKey } from '@/lib/dues'
import { fetchAll } from '@/lib/dues-engine'
import { fetchPresentAttendance, studentSessionRate } from '@/lib/teacher-payroll'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PayrollActions } from './PayrollActions'

export const dynamic = 'force-dynamic'

const DEFAULT_SESSION_RATE = 25

function monthBounds(key?: string) {
  if (key === 'all') {
    return { start: '2020-01-01', end: '2099-12-31', label: 'كل الشهور', key: 'all' }
  }
  if (!key) key = currentMonthKey()
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  if (!y || !m) {
    return monthBounds(currentMonthKey())
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key: `${y}-${String(m).padStart(2, '0')}` }
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  try {
    const sp = await searchParams
    const { start: monthStart, end: monthEnd, label, key } = monthBounds(sp.month || currentMonthKey())

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, code, name, rate_percent, is_active')
      .eq('is_active', true)
      .order('name')

    // نفس مصدر حساب الراتب في الشهري/المعلم: سعر المعلم (teacher_session_rate) مش سعر ولي الأمر
    const attendance = await fetchPresentAttendance(supabase, {
      start: monthStart,
      end: monthEnd,
      columns: 'id, teacher_id, student_id, status, session_date',
      studentCols: 'price_per_session',
    })

    const { data: rateLogs } = await supabase
      .from('activity_log')
      .select('entity_id, details')
      .eq('action', 'teacher_session_rate')

    const teacherDefaultRate: Record<string, number> = {}
    for (const r of rateLogs ?? []) {
      const rate = Number((r.details as any)?.session_rate || 0)
      if (r.entity_id && rate > 0) teacherDefaultRate[r.entity_id] = rate
    }

    type Agg = { sessions: number; salary: number; rates: Record<number, number> }
    const byTeacher: Record<string, Agg> = {}

    for (const a of attendance) {
      if (!a.teacher_id) continue
      if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = { sessions: 0, salary: 0, rates: {} }
      const st = a.students as any
      const rate = studentSessionRate(st, teacherDefaultRate[a.teacher_id])
      byTeacher[a.teacher_id].sessions += 1
      byTeacher[a.teacher_id].salary += rate
      byTeacher[a.teacher_id].rates[rate] = (byTeacher[a.teacher_id].rates[rate] || 0) + 1
    }

    const settlements = await fetchAll<any>((f, to) =>
      supabase
        .from('activity_log')
        .select('details')
        .eq('action', 'teacher_settlement')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(f, to)
    )
    const settledById: Record<string, number> = {}
    const settledByName: Record<string, number> = {}
    for (const s of settlements) {
      const d = s.details as any
      if (d?.month && key !== 'all' && d.month !== key) continue
      const amt = Number(d?.amount || 0)
      if (d?.teacher_id) settledById[d.teacher_id] = (settledById[d.teacher_id] || 0) + amt
      else if (d?.teacher_name) settledByName[d.teacher_name] = (settledByName[d.teacher_name] || 0) + amt
    }

    const rows = (teachers ?? [])
      .map((t) => {
        const agg = byTeacher[t.id] || { sessions: 0, salary: 0, rates: {} }
        const defaultRate = teacherDefaultRate[t.id] ?? DEFAULT_SESSION_RATE
        const settled = (settledById[t.id] || 0) + (settledByName[t.name] || 0)
        const remaining = Math.max(0, agg.salary - settled)
        const rateParts = Object.entries(agg.rates)
          .map(([rate, cnt]) => `${cnt}×${rate}`)
          .join(' + ')
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          sessions: agg.sessions,
          sessionRate: defaultRate,
          rateParts: rateParts || `0×${defaultRate}`,
          multiRate: Object.keys(agg.rates).length > 1,
          academyRate: Number(t.rate_percent || 50),
          salary: agg.salary,
          settled,
          remaining,
        }
      })
      .sort((a, b) => b.salary - a.salary)

    const totalSalary = rows.reduce((s, r) => s + r.salary, 0)
    const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)
    const totalSettled = rows.reduce((s, r) => s + r.settled, 0)
    const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0)

    const prevKey =
      key === 'all'
        ? currentMonthKey()
        : (() => {
            const y = Number(key.slice(0, 4))
            const m = Number(key.slice(5, 7))
            const d = m === 1 ? new Date(y - 1, 11, 1) : new Date(y, m - 2, 1)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          })()
    const nextKey =
      key === 'all'
        ? currentMonthKey()
        : (() => {
            const y = Number(key.slice(0, 4))
            const m = Number(key.slice(5, 7))
            const d = m === 12 ? new Date(y + 1, 0, 1) : new Date(y, m, 1)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          })()

    return (
      <div className="space-y-4 pb-8">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-[18px] font-bold" style={{ color: '#00513c' }}>
              رواتب المعلمين
            </h1>
            <p className="text-[12px]" style={{ color: '#6f7974' }}>
              {label} · يحسب من سعر حصة المعلم (teacher_session_rate)
            </p>
          </div>
          <Link href="/admin" className="text-[12px] font-bold" style={{ color: '#176b52' }}>
            رجوع
          </Link>
        </div>

        <div className="flex items-center justify-between gap-2 text-[12px] font-bold">
          <Link href={`/admin/payroll?month=${prevKey}`} style={{ color: '#176b52' }}>
            ← السابق
          </Link>
          <Link href={`/admin/payroll?month=${nextKey}`} style={{ color: '#176b52' }}>
            التالي →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl p-3 text-white" style={{ background: 'linear-gradient(135deg,#00513c,#176b52)' }}>
            <p className="text-[11px] opacity-80">إجمالي الرواتب</p>
            <p className="text-[20px] font-bold">{Math.round(totalSalary).toLocaleString('en-US')} ج</p>
            <p className="text-[10px] opacity-80">{totalSessions} حصة</p>
          </div>
          <div className="rounded-2xl p-3 bg-white shadow-sm">
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              المتبقي للصرف
            </p>
            <p className="text-[20px] font-bold" style={{ color: '#ba1a1a' }}>
              {Math.round(totalRemaining).toLocaleString('en-US')} ج
            </p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              صُرف {Math.round(totalSettled).toLocaleString('en-US')} ج
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/payroll/${r.id}?month=${key}`} className="font-bold text-[14px]" style={{ color: '#00513c' }}>
                    {r.name}
                  </Link>
                  <p className="text-[11px]" style={{ color: '#6f7974' }}>
                    {r.code} · {r.sessions} حصة · {r.rateParts}
                    {r.multiRate ? ' (أسعار متعددة)' : ''}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-bold text-[15px]" style={{ color: '#176b52' }}>
                    {Math.round(r.salary).toLocaleString('en-US')} ج
                  </p>
                  {r.settled > 0 && (
                    <p className="text-[10px]" style={{ color: '#6f7974' }}>
                      صُرف {Math.round(r.settled).toLocaleString('en-US')} · متبقي{' '}
                      {Math.round(r.remaining).toLocaleString('en-US')}
                    </p>
                  )}
                </div>
              </div>
              <PayrollActions
                teacherId={r.id}
                teacherName={r.name}
                month={key === 'all' ? currentMonthKey() : key}
                remaining={r.remaining}
              />
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-[13px] py-8" style={{ color: '#6f7974' }}>
              مفيش معلمين نشطين أو حصص في الفترة دي
            </p>
          )}
        </div>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="p-4">
        <p className="text-center font-bold" style={{ color: '#ba1a1a' }}>
          {e?.message || 'فشل تحميل الرواتب'}
        </p>
        <Link href="/admin" className="block text-center mt-4 text-[13px]" style={{ color: '#176b52' }}>
          رجوع
        </Link>
      </div>
    )
  }
}
