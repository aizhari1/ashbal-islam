import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [
    { count: active },
    { count: paused },
    { count: teachers },
    { count: withdrawn },
    { data: payments },
    { data: dues },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'منسحب'),
    supabase.from('payments').select('amount').limit(500),
    supabase.from('students').select('amount_due').gt('amount_due', 0),
  ])

  const collected = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const dueTotal = (dues ?? []).reduce((s, d) => s + Number(d.amount_due || 0), 0)

  const cards = [
    { href: '/admin/finance', icon: 'payments', title: 'تذكير بالمستحقات والتقرير المالي', desc: 'مين عليه فلوس + ملخص التحصيل' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'المنسحبين', desc: 'الطلاب في حالة انسحاب' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'المتوقفين مؤقتاً', desc: 'للتواصل السريع' },
    { href: '/admin/students?status=تجريبي', icon: 'science', title: 'الحصص التجريبية', desc: 'متابعة الطلاب المحتملين' },
    { href: '/admin/finance', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'كل الدفعات المسجّلة' },
    { href: '/admin/schedule', icon: 'event_available', title: 'الحصص اللي حضروها', desc: 'أي حصة علّمها حضور تظهر هنا' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'الرواتب بعدد الحصص', desc: 'راتب كل معلم = عدد الحصص × النسبة' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف باقات + إحصائية' },
    { href: '/admin/students', icon: 'groups', title: 'قائمة كل الطلاب', desc: 'كل المسجلين مع تفاصيلهم' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب مشترك جديد', desc: 'بيانات + مواعيد حلقاته' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'إضافة/إزالة مدير، مشرف، أو معلم' },
    { href: '/evaluate', icon: 'family_restroom', title: 'تقييمات أولياء الأمور', desc: 'فورم عام بدون تسجيل دخول' },
    { href: '/admin/more', icon: 'settings', title: 'المزيد والإعدادات', desc: 'خروج وروابط إضافية' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'تسجيل حضور + حفظ ومراجعة' },
  ]

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <div className="bg-[#0d9b8a] text-white px-3 pt-4 pb-5">
        <div className="flex justify-between items-center mb-3 px-1">
          <span className="text-[13px] font-medium">أشبال الإسلام</span>
          <span className="text-[12px] opacity-90">{profile?.full_name || 'الإدارة'}</span>
        </div>
        <div className="grid grid-cols-3 text-center">
          <div>
            <p className="text-[28px] font-bold leading-none">{active ?? 0}</p>
            <p className="text-[11px] mt-1 opacity-90">طالب نشط</p>
          </div>
          <div className="border-x border-white/25">
            <p className="text-[28px] font-bold leading-none">{paused ?? 0}</p>
            <p className="text-[11px] mt-1 opacity-90">متوقف مؤقتاً</p>
          </div>
          <div>
            <p className="text-[28px] font-bold leading-none">{teachers ?? 0}</p>
            <p className="text-[11px] mt-1 opacity-90">معلم / ة</p>
          </div>
        </div>
      </div>

      <main className="px-3 -mt-2 pb-28">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-3">
          <p className="text-[13px] font-bold mb-2 text-left">لمحة مالية سريعة</p>
          <div className="grid grid-cols-2 gap-y-2 text-[13px]">
            <div className="text-left">
              <span className="text-[#6f7974]">قبضنا</span>
              <p className="font-bold text-[16px]">{collected.toLocaleString('ar-EG')}</p>
            </div>
            <div className="text-left">
              <span className="text-[#6f7974]">مستحقات</span>
              <p className="font-bold text-[16px] text-[#ba1a1a]">{dueTotal.toLocaleString('ar-EG')}</p>
            </div>
            <div className="text-left">
              <span className="text-[#6f7974]">منسحب</span>
              <p className="font-bold">{withdrawn ?? 0}</p>
            </div>
            <div className="text-left">
              <span className="text-[#6f7974]">رواتب</span>
              <p className="font-bold"><Link href="/admin/payroll" className="text-[#0d9b8a]">عرض</Link></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <Link key={c.href + c.title} href={c.href}
              className="bg-white rounded-2xl p-3.5 shadow-sm flex flex-col gap-1 min-h-[88px]">
              <span className="material-symbols-outlined text-[22px] text-[#0d9b8a]">{c.icon}</span>
              <span className="text-[13px] font-bold text-[#1a2e28] leading-snug">{c.title}</span>
              <span className="text-[11px] text-[#6f7974] leading-snug">{c.desc}</span>
            </Link>
          ))}
        </div>
      </main>

      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white border-t flex justify-around py-2 text-[10px]">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية' },
          { href: '/admin/students/new', icon: 'person_add', label: 'إضافة' },
          { href: '/admin/finance', icon: 'receipt_long', label: 'الرسوم' },
          { href: '/admin/students', icon: 'swap_horiz', label: 'نقل' },
          { href: '/admin/students', icon: 'tune', label: 'الحالة' },
        ].map((n) => (
          <Link key={n.label} href={n.href} className="flex flex-col items-center text-[#6f7974] min-w-[56px]">
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
