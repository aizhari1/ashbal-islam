import { currentMonthKey } from '@/lib/dues'
import { fetchAll } from '@/lib/dues-engine'
import { fetchPresentAttendance, studentSessionRate } from '@/lib/teacher-payroll'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const DEFAULT_SESSION_RATE = 25

function monthBounds(key: string) {
  const [y, m] = key.split('-').map(Number)
  const start = `${key}-01`
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${key}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function monthLabelAr(key: string) {
  const [y, m] = key.split('-').map(Number)
  const names = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  return `${names[m - 1]} ${y}`
}

function shiftMonth(key: string, n: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!profile || !['admin', 'supervisor'].includes(String(profile.role))) redirect('/login')

  const monthKey = /^\d{4}-\d{2}$/.test(sp.month || '') ? (sp.month as string) : currentMonthKey()
  const { start: monthStart, end: monthEnd } = monthBounds(monthKey)

  let teachers: any[] = []
  let rows: { id: string; name: string; sessions: number; salary: number; rates: Record<number, number> }[] = []
  let errorMsg = ''

  try {
    const { data: tList } = await supabase
      .from('teachers')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name')

    teachers = tList || []

    // نفس مصدر حساب الراتب في الشهري/المعلم: سعر المعلم (teacher_session_rate) مش سعر ولي الأمر
    const attendance = await fetchPresentAttendance(supabase, {
      start: monthStart,
      end: monthEnd,
      columns: 'id, teacher_id, student_id, status, session_date',
      studentCols: 'price_per_session',
    })

    const { data: rateLogs } = await supabase
      .from('activity_log')
      .select('entity_id, details, created_at')
      .eq('action', 'teacher_session_rate')
      .order('created_at', { ascending: false })
      .limit(500)

    const teacherDefaultRate: Record<string, number> = {}
    for (const log of rateLogs || []) {
      const tid = String(log.entity_id || '')
      if (!tid || teacherDefaultRate[tid] !== undefined) continue
      const rate = Number((log.details as any)?.session_rate || 0)
      if (rate > 0) teacherDefaultRate[tid] = rate
    }

    const byTeacher: Record<string, { sessions: number; salary: number; rates: Record<number, number> }> = {}
    for (const a of attendance) {
      if (!a.teacher_id) continue
      if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = { sessions: 0, salary: 0, rates: {} }
      const st = a.students as any
      const rate = studentSessionRate(st, teacherDefaultRate[a.teacher_id])
      byTeacher[a.teacher_id].sessions += 1
      byTeacher[a.teacher_id].salary += rate
      byTeacher[a.teacher_id].rates[rate] = (byTeacher[a.teacher_id].rates[rate] || 0) + 1
    }

    rows = (teachers || []).map((t) => ({
      id: t.id,
      name: t.name,
      sessions: byTeacher[t.id]?.sessions || 0,
      salary: byTeacher[t.id]?.salary || 0,
      rates: byTeacher[t.id]?.rates || {},
    }))
    rows.sort((a, b) => b.salary - a.salary)
  } catch (e: any) {
    errorMsg = e?.message || 'فشل تحميل الرواتب'
  }

  const totalSalary = rows.reduce((s, r) => s + r.salary, 0)
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-16">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">رواتب المعلمين</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {monthLabelAr(monthKey)}
          </p>
        </div>
      </header>

      <div className="px-4 flex items-center justify-between text-[12px] font-bold pb-2" style={{ color: '#176b52' }}>
        <Link href={`/admin/payroll?month=${shiftMonth(monthKey, -1)}`}>‹ {monthLabelAr(shiftMonth(monthKey, -1))}</Link>
        <Link href={`/admin/payroll?month=${shiftMonth(monthKey, 1)}`}>{monthLabelAr(shiftMonth(monthKey, 1))} ›</Link>
      </div>

      <main className="px-4 space-y-3">
        {errorMsg && (
          <p className="text-center text-[13px] font-bold rounded-xl py-2" style={{ background: '#ffdad6', color: '#93000a' }}>
            {errorMsg}
          </p>
        )}

        <section className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#00513c,#176b52)' }}>
          <p className="text-[12px] opacity-80">إجمالي رواتب الشهر</p>
          <p className="text-[26px] font-bold">{Math.round(totalSalary).toLocaleString('en-US')} ج</p>
          <p className="text-[11px] opacity-80 mt-1">{totalSessions} حصة · {rows.filter((r) => r.sessions > 0).length} معلم نشط</p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm divide-y" style={{ borderColor: '#eef5f1' }}>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/payroll/${r.id}?month=${monthKey}`}
              className="flex items-center justify-between gap-2 px-3 py-3 text-[13px]"
            >
              <div className="min-w-0">
                <p className="font-bold truncate">{r.name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {r.sessions} حصة
                  {Object.keys(r.rates).length > 1
                    ? ` · أسعار: ${Object.entries(r.rates)
                        .map(([k, v]) => `${k}×${v}`)
                        .join('، ')}`
                    : r.sessions
                      ? ` · ${Object.keys(r.rates)[0] || DEFAULT_SESSION_RATE} ج/حصة`
                      : ''}
                </p>
              </div>
              <b style={{ color: '#176b52' }}>{Math.round(r.salary).toLocaleString('en-US')} ج</b>
            </Link>
          ))}
          {rows.length === 0 && !errorMsg && (
            <p className="text-center text-[12px] py-6" style={{ color: '#6f7974' }}>
              مفيش بيانات لهذا الشهر
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
