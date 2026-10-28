import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, status, subscription_type, monthly_sessions, price_per_session, amount_due')

  const active = (students ?? []).filter((s) => s.status === 'نشط')
  const paused = (students ?? []).filter((s) => s.status === 'موقوف' || s.status === 'متوقف')
  const withdrawn = (students ?? []).filter((s) => String(s.status || '').includes('منسحب'))

  const bySessions: Record<string, number> = {}
  for (const s of active) {
    const n = s.monthly_sessions != null ? String(s.monthly_sessions) : '?'
    bySessions[n] = (bySessions[n] || 0) + 1
  }

  const packageRows = Object.entries(bySessions)
    .map(([sessions, count]) => ({ sessions, count }))
    .sort((a, b) => b.count - a.count)

  const maxPkg = packageRows[0]
  const minPkg = packageRows.length ? packageRows[packageRows.length - 1] : null

  const dueCount = active.filter((s) => Number(s.amount_due) > 0).length
  const dueSum = active.reduce((s, x) => s + Number(x.amount_due || 0), 0)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>تحليلات وإحصائيات</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>الباقات · الطلاب · المستحقات</p>
        </div>
      </header>

      <section className="px-4 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{active.length}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>نشط</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[20px] font-bold" style={{ color: '#d49a35' }}>{paused.length}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>متوقف</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[20px] font-bold" style={{ color: '#ba1a1a' }}>{withdrawn.length}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>منسحب</p>
          </div>
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>توزيع الباقات (الطلاب النشطين)</h2>
        {maxPkg && (
          <div className="card p-3 mb-2" style={{ background: '#e8f7f0' }}>
            <p className="text-[12px]" style={{ color: '#6f7974' }}>أكثر باقة مشتركة</p>
            <p className="text-[15px] font-bold" style={{ color: '#176b52' }}>
              {maxPkg.sessions} حصة/شهر — {maxPkg.count} طالب
            </p>
          </div>
        )}
        {minPkg && minPkg !== maxPkg && (
          <div className="card p-3 mb-2">
            <p className="text-[12px]" style={{ color: '#6f7974' }}>أقل باقة</p>
            <p className="text-[15px] font-bold" style={{ color: '#755b1b' }}>
              {minPkg.sessions} حصة/شهر — {minPkg.count} طالب
            </p>
          </div>
        )}

        <div className="card overflow-hidden">
          {packageRows.map((r) => {
            const pct = active.length ? Math.round((r.count / active.length) * 100) : 0
            return (
              <div key={r.sessions} className="px-3.5 py-3 border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-bold">باقة {r.sessions} حصة / شهر</span>
                  <span>{r.count} طالب ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e2f1eb' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#176b52' }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>المستحقات</h2>
        <div className="card p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>طلاب عليهم مستحق</p>
            <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{dueCount}</p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>إجمالي المستحق</p>
            <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{dueSum.toLocaleString('ar-EG')}</p>
          </div>
        </div>
      </section>

      <p className="px-4 text-[11px] text-center" style={{ color: '#6f7974' }}>
        <Link href="/admin/monthly" className="font-semibold" style={{ color: '#176b52' }}>الملخص الشهري ←</Link>
        {' · '}
        <Link href="/admin/teacher-eval" className="font-semibold" style={{ color: '#176b52' }}>تقييم المعلمين ←</Link>
      </p>
    </div>
  )
}
