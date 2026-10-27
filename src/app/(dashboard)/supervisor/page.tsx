import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SupervisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile && !['supervisor', 'admin'].includes(profile.role)) redirect('/login')

  const cards = [
    { href: '/admin/students', icon: 'edit', title: 'تعديل بيانات طالب', desc: 'الاسم، الاشتراك، سعر الحصة، أي بيان تاني' },
    { href: '/admin/students', icon: 'group', title: 'قائمة كل الطلاب', desc: 'كل المسجلين في الأكاديمية مع تفاصيلهم' },
    { href: '/admin/finance', icon: 'credit_card', title: 'تسجيل اشتراك (دفعة)', desc: 'طريقة الدفع، المبلغ، عدد الشهور' },
    { href: '/admin/fixed-schedule', icon: 'calendar_month', title: 'تعديل مواعيد الحلقات', desc: 'إضافة أو حذف مواعيد ثابتة للطالب' },
    { href: '/admin/finance', icon: 'notifications', title: 'تذكير بالمستحقات وتقرير مالي', desc: 'نفس تقرير الإدارة — مين محتاج تذكير بالدفع' },
    { href: '/admin/students', icon: 'check_circle', title: 'تغيير حالة الطالب', desc: 'انسحاب / توقف / رجوع' },
    { href: '/admin/students?status=منسحب', icon: 'menu_book', title: 'قائمة الطلاب المنسحبين', desc: 'أرشيف الانسحاب' },
    { href: '/admin/supervisor-eval', icon: 'star', title: 'تقييماتي ونقاطي', desc: 'تقييم الإدارة ليك + تجميع نقاط الشهر' },
    { href: '/admin/students?status=تجريبي', icon: 'assignment', title: 'قائمة الحصص التجريبية', desc: 'متابعة المحتملين' },
    { href: '/admin/students?status=موقوف', icon: 'auto_stories', title: 'قائمة المتوقفين مؤقتًا', desc: 'للتواصل السريع معاهم' },
    { href: '/admin/notes', icon: 'edit_note', title: 'ملاحظة أو مشكلة للإدارة', desc: 'أرسل ملاحظة للإدارة' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'كل الدفعات المسجّلة' },
    { href: '/admin/students/new?trial=1', icon: 'person_add', title: 'إضافة طالب تجريبي', desc: 'حصة تجريبية مستقلة' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب مشترك جديد', desc: 'بيانات + مواعيد حلقاته الثابتة' },
    { href: '/admin/transfer', icon: 'swap_horiz', title: 'نقل طالب / تغيير معلم', desc: 'تحويل الطالب لمعلم آخر' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-8" style={{ background: '#f5f3ef' }}>
      <div className="px-4 pt-4 pb-3 flex items-center justify-between" style={{ background: '#176b52' }}>
        <Link href="/login" className="text-white text-[12px] opacity-90">⏻ خروج</Link>
        <div className="text-left text-white">
          <h1 className="text-[16px] font-bold">أشبال الإسلام</h1>
          <p className="text-[11px] opacity-85">تطبيق الإشراف · {profile?.full_name || 'مشرف'}</p>
        </div>
      </div>

      <main className="px-3 py-3 grid grid-cols-2 gap-2.5">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="bg-white rounded-2xl p-3.5 min-h-[100px] flex flex-col gap-1.5 shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.04)' }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center material-symbols-outlined text-[20px]"
              style={{ background: '#eefdf6', color: '#176b52' }}
            >
              {c.icon}
            </span>
            <span className="text-[13px] font-bold leading-snug" style={{ color: '#1a3c34' }}>{c.title}</span>
            <span className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>{c.desc}</span>
          </Link>
        ))}
      </main>
    </div>
  )
}
