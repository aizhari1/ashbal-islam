import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ensureMonthArchived } from '@/app/actions/month-archive'
import { currentMonthKey } from '@/lib/dues'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // أول دخول بعد بداية شهر جديد → يحفظ ملخص الشهر السابق
  await ensureMonthArchived()

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const monthKey = currentMonthKey()
  const [y, m] = monthKey.split('-').map(Number)
  const monthStart = `${monthKey}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

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
    supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', monthStart)
      .lte('payment_date', monthEnd)
      .limit(1000),
    supabase.from('students').select('amount_due').gt('amount_due', 0),
  ])

  const collected = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const dueTotal = (dues ?? []).reduce((s: number, d: any) => s + Number(d.amount_due || 0), 0)
  const dueCount = dues?.length ?? 0

  const menu = [
    { href: `/admin/monthly?month=${monthKey}`, icon: 'calendar_view_month', title: 'الملخص الشهري', desc: 'دخل · صرف · حصص · تقييمات', color: '#00513c' },
    { href: '/admin/sessions-detail', icon: 'list_alt', title: 'تفاصيل الحصص', desc: 'لكل معلم · طلاب · سعر ومدة', color: '#00513c' },
    { href: '/admin/payments', icon: 'credit_card', title: 'المدفوعات', desc: 'إنستا · فودافون · بنكي', color: '#755b1b' },
    { href: '/admin/activity', icon: 'history', title: 'سجل النشاط', desc: 'كل التغييرات في تايم لاين', color: '#3d665a' },
    { href: '/admin/edit-session', icon: 'edit_note', title: 'تعديل رقم الحصة', desc: 'آخر حصة لأي طالب', color: '#176b52' },
    { href: '/admin/trials', icon: 'science', title: 'الحصص التجريبية', desc: 'طلاب محتملون ومتابعة', color: '#176b52' },
    { href: '/admin/teacher-absences', icon: 'event_busy', title: 'غيابات المعلمين', desc: 'المسجّلة من الإشراف', color: '#b45309' },
    { href: '/admin/analytics', icon: 'bar_chart', title: 'تحليلات الباقات', desc: 'أكثر وأقل باقة · نسب', color: '#176b52' },
    { href: '/admin/notes', icon: 'sticky_note_2', title: 'الملاحظات', desc: 'ملاحظات الإدارة والإشراف', color: '#3d665a' },
    { href: '/admin/chat', icon: 'chat', title: 'شات المعلمين', desc: 'محادثة إدارة ↔ معلم', color: '#176b52' },
    { href: '/admin/students', icon: 'groups', title: 'إدارة شؤون الطلاب', desc: 'سجلات المتابعة', color: '#176b52' },
    { href: '/admin/students/new', icon: 'person_add', title: 'طالب جديد', desc: 'تسجيل واشتراك', color: '#176b52' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص شهري', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء + إدارة', color: '#176b52' },
    { href: '/admin/finance', icon: 'payments', title: 'التذكير المالي', desc: 'مستحقات واشتراكات', color: '#755b1b' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × سعر الطالب', color: '#755b1b' },
    { href: '/admin/cashbox', icon: 'savings', title: 'الصندوق', desc: 'دخل وصرف', color: '#176b52' },
    { href: '/admin/schedule', icon: 'calendar_month', title: 'الجدول', desc: 'مواعيد', color: '#3d665a' },
    { href: '/admin/fixed-schedule', icon: 'event_repeat', title: 'المواعيد الثابتة', desc: 'جدول ثابت', color: '#3d665a' },
    { href: '/admin/families', icon: 'family_restroom', title: 'العائلات', desc: 'أولياء', color: '#176b52' },
    { href: '/admin/supervisors', icon: 'supervisor_account', title: 'المشرفون', desc: 'إدارة', color: '#00513c' },
    { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'من الإدارة', color: '#755b1b' },
    { href: '/admin/supervisor-eval', icon: 'verified', title: 'تقييم الإشراف', desc: 'من الإدارة', color: '#755b1b' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'مدفوعات', color: '#3d665a' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'المتوقفين مؤقتًا', desc: 'للتواصل السريع', color: '#b45309' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'المنسحبين', desc: 'أرشيف', color: '#6f7974' },
    { href: '/evaluate', icon: 'family_restroom', title: 'فورم أولياء الأمور', desc: 'بدون دخول', color: '#176b52' },
    { href: '/student', icon: 'school', title: 'بوابة الطالب', desc: 'مواعيد ومستحق بالكود', color: '#176b52' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أدوار', color: '#00513c' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف', color: '#3d665a' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حضور + تقييم الحصة', color: '#176b52' },
    { href: '/admin/more', icon: 'settings', title: 'المزيد', desc: 'خروج', color: '#6f7974' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#176b52' }}>
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              الإدارة
            </p>
            <h1 className="text-[15px] font-bold" style={{ color: '#00513c' }}>
              أكاديمية أشبال الإسلام
            </h1>
          </div>
        </div>
      </header>

      <div className="px-4 mt-2 mb-4">
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, #176b52, #00513c)', border: 'none' }}>
          <p className="text-white text-[12px] opacity-80">مرحباً</p>
          <h2 className="text-white text-[18px] font-bold">{profile?.full_name || 'الإدارة'}</h2>
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'نشط', value: active ?? 0 },
          { label: 'متوقف', value: paused ?? 0 },
          { label: 'معلم', value: teachers ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[22px] font-bold" style={{ color: '#00513c' }}>
              {s.value}
            </p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4 mb-4">
        <div className="card p-4">
          <p className="text-[12px] mb-2" style={{ color: '#6f7974' }}>
            {monthLabel} — نظرة سريعة (الشهر الحالي)
          </p>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <span style={{ color: '#6f7974' }}>محصّل: </span>
              <b style={{ color: '#176b52' }}>{collected.toLocaleString('ar-EG')} ج</b>
            </div>
            <div>
              <span style={{ color: '#6f7974' }}>مستحق: </span>
              <b style={{ color: '#b45309' }}>
                {dueTotal.toLocaleString('ar-EG')} ج ({dueCount})
              </b>
            </div>
            <div>
              <span style={{ color: '#6f7974' }}>منسحب: </span>
              <b>{withdrawn ?? 0}</b>
            </div>
            <div>
              <Link href={`/admin/monthly?month=${monthKey}`} style={{ color: '#176b52' }} className="font-bold">
                الملخص الشهري ←
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-2.5 mb-6">
        {menu.map((m) => (
          <Link key={m.href + m.title} href={m.href} className="card p-3.5 flex flex-col gap-1.5 active:scale-[0.98] transition">
            <span className="material-symbols-outlined text-[22px]" style={{ color: m.color }}>
              {m.icon}
            </span>
            <p className="text-[13px] font-bold" style={{ color: '#1a1c1b' }}>
              {m.title}
            </p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              {m.desc}
            </p>
          </Link>
        ))}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 max-w-lg mx-auto"
        style={{ borderColor: '#cde8dc' }}
      >
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية' },
          { href: `/admin/monthly?month=${monthKey}`, icon: 'calendar_view_month', label: 'ملخص' },
          { href: '/admin/sessions-detail', icon: 'list_alt', label: 'حصص' },
          { href: '/admin/payments', icon: 'credit_card', label: 'دفع' },
          { href: '/admin/more', icon: 'more_horiz', label: 'المزيد' },
        ].map((i) => (
          <Link key={i.href} href={i.href} className="flex flex-col items-center gap-0.5 px-2">
            <span className="material-symbols-outlined text-[22px]" style={{ color: '#176b52' }}>
              {i.icon}
            </span>
            <span className="text-[10px]" style={{ color: '#3f4944' }}>
              {i.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
