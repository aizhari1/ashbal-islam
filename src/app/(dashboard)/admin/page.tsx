import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [
    { count: totalStudents },
    { count: activeStudents },
    { count: pausedStudents },
    { count: teachersCount },
    { data: recentPayments },
    { data: dues },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('payments').select('amount').limit(200),
    supabase.from('students').select('amount_due').gt('amount_due', 0),
  ])

  const totalPaid = (recentPayments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalDue = (dues ?? []).reduce((s, d) => s + Number(d.amount_due || 0), 0)
  const dateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
  const name = profile?.full_name || 'المدير'

  const links = [
    { href: '/admin/students', icon: 'school', label: 'الطلاب', color: '#176b52' },
    { href: '/admin/students/new', icon: 'person_add', label: 'إضافة طالب', color: '#0d7377' },
    { href: '/admin/finance', icon: 'payments', label: 'المالية', color: '#c5a45d' },
    { href: '/admin/schedule', icon: 'calendar_month', label: 'الحضور', color: '#5b6abf' },
    { href: '/admin/packages', icon: 'inventory_2', label: 'الباقات', color: '#8b5cf6' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', label: 'رواتب المعلمين', color: '#e07a5f' },
    { href: '/teacher/session', icon: 'mic', label: 'غرفة التسميع', color: '#23845b' },
    { href: '/admin/more', icon: 'apps', label: 'المزيد', color: '#6f7974' },
  ]

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 pt-5 pb-3">
        <p className="text-[12px] text-[#6f7974]">أكاديمية أشبال الإسلام</p>
        <h1 className="text-[22px] font-bold text-[#111e1a]">مرحباً {name}</h1>
        <p className="text-[12px] text-[#6f7974] mt-0.5">{dateStr}</p>
      </header>

      <main className="px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[28px] font-bold leading-none">{activeStudents ?? 0}</p>
            <p className="text-[12px] text-[#6f7974] mt-1">طلاب نشطون</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[28px] font-bold leading-none">{teachersCount ?? 0}</p>
            <p className="text-[12px] text-[#6f7974] mt-1">معلمون</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[22px] font-bold leading-none text-[#176b52]">{totalPaid.toLocaleString('ar-EG')}</p>
            <p className="text-[12px] text-[#6f7974] mt-1">محصّل (ج.م)</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[22px] font-bold leading-none text-[#ba1a1a]">{totalDue.toLocaleString('ar-EG')}</p>
            <p className="text-[12px] text-[#6f7974] mt-1">مستحقات</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm mb-4 flex gap-3 text-[12px]">
          <span>الإجمالي: <b>{totalStudents ?? 0}</b></span>
          <span className="text-[#6f7974]">|</span>
          <span>موقوف: <b>{pausedStudents ?? 0}</b></span>
        </div>

        <h2 className="text-[14px] font-bold mb-2">الوصول السريع</h2>
        <div className="grid grid-cols-4 gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="bg-white rounded-2xl p-3 shadow-sm flex flex-col items-center gap-1.5 text-center">
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${l.color}18` }}>
                <span className="material-symbols-outlined text-[22px]" style={{ color: l.color }}>{l.icon}</span>
              </span>
              <span className="text-[11px] font-medium text-[#3f4944] leading-tight">{l.label}</span>
            </Link>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white border-t flex justify-around py-2">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية' },
          { href: '/admin/students', icon: 'school', label: 'الطلاب' },
          { href: '/admin/finance', icon: 'payments', label: 'المالية' },
          { href: '/admin/schedule', icon: 'calendar_month', label: 'الحضور' },
        ].map((n) => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center text-[#6f7974] min-w-[64px]">
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            <span className="text-[10px]">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
