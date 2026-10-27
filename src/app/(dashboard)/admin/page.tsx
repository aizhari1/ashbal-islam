import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let studentCount = 0
  let teacherCount = 0
  let activeCount = 0
  let totalDue = 0

  try {
    const { count: sc } = await supabase.from('students').select('*', { count: 'exact', head: true })
    const { count: tc } = await supabase.from('teachers').select('*', { count: 'exact', head: true })
    const { count: ac } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط')
    const { data: dues } = await supabase.from('students').select('amount_due')
    studentCount = sc ?? 0
    teacherCount = tc ?? 0
    activeCount = ac ?? 0
    totalDue = (dues ?? []).reduce((s, r) => s + (Number(r.amount_due) || 0), 0)
  } catch {
    // tables may not exist yet
  }

  const stats = [
    { label: 'إجمالي الطلاب', value: studentCount, icon: 'school', href: '/admin/students' },
    { label: 'الطلاب النشطون', value: activeCount, icon: 'check_circle', href: '/admin/students' },
    { label: 'المعلمون', value: teacherCount, icon: 'groups', href: '/admin' },
    { label: 'المستحقات', value: `${totalDue.toLocaleString('ar-EG')} ج.م`, icon: 'payments', href: '/admin/finance' },
  ]

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#eefdf6]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-[#6f7974]">لوحة المدير</p>
          <h1 className="text-[18px] font-bold text-[#00513c]">أكاديمية موعظة ونور</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#176b52] flex items-center justify-center text-white font-bold">
          {(user?.email?.[0] || 'م').toUpperCase()}
        </div>
      </header>

      <main className="px-4 pb-24">
        <div className="grid grid-cols-2 gap-3 mt-2 mb-5">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[rgba(18,61,50,0.06)]"
            >
              <span className="material-symbols-outlined text-[22px] text-[#176b52]">{s.icon}</span>
              <p className="text-[22px] font-bold text-[#111e1a] mt-1 leading-none">{s.value}</p>
              <p className="text-[12px] text-[#6f7974] mt-1">{s.label}</p>
            </Link>
          ))}
        </div>

        <h2 className="text-[14px] font-bold text-[#111e1a] mb-3">اختصارات سريعة</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: '/admin/students', icon: 'person', label: 'الطلاب' },
            { href: '/admin/students/new', icon: 'person_add', label: 'طالب جديد' },
            { href: '/admin/finance', icon: 'payments', label: 'المالية' },
            { href: '/admin/schedule', icon: 'calendar_month', label: 'الجدول' },
            { href: '/admin/packages', icon: 'inventory_2', label: 'الباقات' },
            { href: '/admin/notifications', icon: 'notifications', label: 'الإشعارات' },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="bg-white rounded-2xl p-3 text-center shadow-sm border border-[rgba(18,61,50,0.06)]"
            >
              <span className="material-symbols-outlined text-[24px] text-[#176b52]">{a.icon}</span>
              <p className="text-[11px] font-medium text-[#3f4944] mt-1">{a.label}</p>
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-6 bg-[#fff8e6] rounded-2xl p-4 text-center">
            <p className="text-[13px] text-[#3f4944]">لم يتم تسجيل الدخول بعد</p>
            <Link href="/login" className="inline-block mt-2 text-[#176b52] font-bold text-[14px]">
              تسجيل الدخول
            </Link>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-[#bec9c2]/30 flex justify-around py-1.5 pb-[env(safe-area-inset-bottom)]">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية', active: true },
          { href: '/admin/students', icon: 'school', label: 'الطلاب' },
          { href: '/admin/finance', icon: 'payments', label: 'المالية' },
          { href: '/admin/schedule', icon: 'calendar_month', label: 'الجدول' },
        ].map((n) => (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 px-3 py-1 ${n.active ? 'text-[#00513c]' : 'text-[#6f7974]'}`}>
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            <span className="text-[10px] font-medium">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
