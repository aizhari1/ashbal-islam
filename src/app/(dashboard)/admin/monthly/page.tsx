import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MonthPicker } from './MonthPicker'

const AR_MONTHS = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function parseMonth(s: string | undefined) {
  const now = new Date()
  if (!s || !/^\d{4}-\d{2}$/.test(s)) {
    return { key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [y, m] = s.split('-').map(Number)
  return { key: s, year: y, month: m }
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

export default async function MonthlySummaryPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  // للإدارة فقط — الإشراف ممنوع من دخل الأكاديمية
  if (!profile || profile.role !== 'admin') redirect('/login')

  const { key, year, month } = parseMonth(sp.month)
  const { start, end } = monthBounds(year, month)
  const label = `${AR_MONTHS[month]} ${year}`

  const [
    { data: payments },
    { data: attendance },
    { data: teachers },
    { data: expenses },
    { data: parentEvals },
    { data: teacherEvals },
    { data: supEvals },
    { count: activeStudents },
    { count: newStudents },
  ] = await Promise.all([
    supabase.from('payments').select('amount, payment_date, student_id, method').gte('payment_date', start).lte('payment_date', end),
    supabase.from('attendance').select('id, teacher_id, student_id, session_date, status, session_num').gte('session_date', start).lte('session_date', end),
    supabase.from('teachers').select('id, name, code, session_rate, status'),
    supabase.from('activity_log').select('details, created_at').eq('action', 'cash_expense').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
    supabase.from('activity_log').select('details, created_at').eq('action', 'parent_evaluation').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
    supabase.from('activity_log').select('details, created_at').eq('action', 'teacher_evaluation').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
    supabase.from('activity_log').select('details, created_at').eq('action', 'supervisor_evaluation').gte('created_at', start).lte('created_at', end + 'T23:59:59'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).gte('join_date', start).lte('join_date', end),
  ])

  const income = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const expenseTotal = (expenses ?? []).reduce((s, e) => s + Number((e.details as any)?.amount || 0), 0)
  const present = (attendance ?? []).filter((a) => a.status === 'حاضر' || a.status === 'متأخر')
  const absent = (attendance ?? []).filter((a) => String(a.status || '').includes('غياب'))
  const sessionsCount = present.length

  const rateMap: Record<string, number> = {}
  const nameMap: Record<string, string> = {}
  for (const t of teachers ?? []) {
    rateMap[t.id] = Number(t.session_rate || 25)
    nameMap[t.id] = t.name
  }
  const teacherSessions: Record<string, number> = {}
  for (const a of present) {
    if (!a.teacher_id) continue
    teacherSessions[a.teacher_id] = (teacherSessions[a.teacher_id] || 0) + 1
  }
  const payrollRows = Object.entries(teacherSessions)
    .map(([tid, cnt]) => ({ id: tid, name: nameMap[tid] || '—', sessions: cnt, rate: rateMap[tid] ?? 25, due: cnt * (rateMap[tid] ?? 25) }))
    .sort((a, b) => b.due - a.due)
  const payrollTotal = payrollRows.reduce((s, r) => s + r.due, 0)
  const net = income - expenseTotal - payrollTotal

  function avgRating(rows: any[] | null) {
    if (!rows?.length) return null
    const nums = rows.map((r) => Number((r.details as any)?.rating || (r.details as any)?.score || 0)).filter((n) => n > 0)
    if (!nums.length) return null
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)
  }
  const parentAvg = avgRating(parentEvals)
  const teacherAvg = avgRating(teacherEvals)
  const supAvg = avgRating(supEvals)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>الملخص الشهري</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>للإدارة فقط — اختر أي شهر</p>
        </div>
      </header>

      <div className="px-4 mb-3">
        <MonthPicker current={key} />
        <p className="text-center text-[14px] font-bold mt-2" style={{ color: '#00513c' }}>{label}</p>
      </div>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>المالية</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card p-3.5">
            <p className="text-[11px]" style={{ color: '#6f7974' }}>دخل (محصّل)</p>
            <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{income.toLocaleString('ar-EG')}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>{payments?.length ?? 0} دفعة</p>
          </div>
          <div className="card p-3.5">
            <p className="text-[11px]" style={{ color: '#6f7974' }}>مصروفات</p>
            <p className="text-[20px] font-bold" style={{ color: '#ba1a1a' }}>{expenseTotal.toLocaleString('ar-EG')}</p>
          </div>
          <div className="card p-3.5">
            <p className="text-[11px]" style={{ color: '#6f7974' }}>مستحقات المعلمين</p>
            <p className="text-[20px] font-bold" style={{ color: '#755b1b' }}>{payrollTotal.toLocaleString('ar-EG')}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>{payrollRows.length} معلم</p>
          </div>
          <div className="card p-3.5">
            <p className="text-[11px]" style={{ color: '#6f7974' }}>صافي تقديري</p>
            <p className="text-[20px] font-bold" style={{ color: net >= 0 ? '#176b52' : '#ba1a1a' }}>{net.toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>الحصص والحضور</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{sessionsCount}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>حصة منفذة</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{absent.length}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>غياب</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#3d665a' }}>{attendance?.length ?? 0}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>إجمالي سجلات</p>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>الطلاب</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{activeStudents ?? 0}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>نشط حالياً</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#3d665a' }}>{newStudents ?? 0}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>انضموا في الشهر</p>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>التقييمات والتحليلات</h2>
        <div className="card">
          <div className="p-3.5 flex justify-between items-center border-b" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
            <div><p className="text-[13px] font-bold">أولياء الأمور</p><p className="text-[11px]" style={{ color: '#6f7974' }}>{parentEvals?.length ?? 0} تقييم</p></div>
            <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>{parentAvg ?? '—'}</p>
          </div>
          <div className="p-3.5 flex justify-between items-center border-b" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
            <div><p className="text-[13px] font-bold">تقييم المعلمين</p><p className="text-[11px]" style={{ color: '#6f7974' }}>{teacherEvals?.length ?? 0} تقييم</p></div>
            <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>{teacherAvg ?? '—'}</p>
          </div>
          <div className="p-3.5 flex justify-between items-center">
            <div><p className="text-[13px] font-bold">تقييم الإشراف</p><p className="text-[11px]" style={{ color: '#6f7974' }}>{supEvals?.length ?? 0} تقييم</p></div>
            <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>{supAvg ?? '—'}</p>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[13px] font-bold" style={{ color: '#3f4944' }}>مستحقات المعلمين — {label}</h2>
          <Link href="/admin/payroll" className="text-[11px] font-semibold" style={{ color: '#176b52' }}>المسير ←</Link>
        </div>
        <div className="card overflow-hidden">
          {payrollRows.length === 0 && <p className="p-4 text-center text-[12px]" style={{ color: '#6f7974' }}>لا حصص مسجّلة في هذا الشهر</p>}
          {payrollRows.slice(0, 15).map((r) => (
            <div key={r.id} className="px-3.5 py-2.5 flex justify-between border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
              <div>
                <p className="text-[13px] font-bold">{r.name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>{r.sessions} حصة × {r.rate} ج</p>
              </div>
              <p className="text-[14px] font-bold" style={{ color: '#755b1b' }}>{r.due.toLocaleString('ar-EG')}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="px-4 text-[10px] text-center pb-4" style={{ color: '#6f7974' }}>
        الصفحة للإدارة فقط — الإشراف لا يرى دخل الأكاديمية
      </p>
    </div>
  )
}
