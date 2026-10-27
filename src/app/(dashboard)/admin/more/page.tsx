import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './LogoutButton'

export default async function MorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const items = [
    { href: '/admin/students/new', icon: 'person_add', label: 'إضافة طالب' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', label: 'رواتب المعلمين' },
    { href: '/admin/packages', icon: 'inventory_2', label: 'الباقات' },
    { href: '/admin/finance', icon: 'payments', label: 'المالية' },
    { href: '/admin/schedule', icon: 'calendar_month', label: 'الحضور والجدول' },
    { href: '/teacher/session', icon: 'mic', label: 'غرفة التسميع' },
    { href: '/supervisor', icon: 'supervisor_account', label: 'لوحة المشرف' },
    { href: '/parent', icon: 'family_restroom', label: 'بوابة ولي الأمر' },
  ]

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">المزيد</h1>
      </header>
      <main className="px-4 pb-24 space-y-2">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
            <span className="material-symbols-outlined text-[#176b52]">{i.icon}</span>
            <span className="font-semibold text-[14px]">{i.label}</span>
            <span className="material-symbols-outlined text-[#bec9c2] mr-auto text-[18px]">chevron_left</span>
          </Link>
        ))}
        <LogoutButton />
      </main>
    </div>
  )
}
