import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ensureMonthArchived } from '@/app/actions/month-archive'
import { monthLabelAr } from '@/lib/dues'
import { getDuesSummary } from '@/lib/dues-engine'
import FeatureMenuGrid from '@/components/FeatureMenuGrid'
import { OpenSettleButtons } from './OpenSettleButtons'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard({
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

  try {
    await ensureMonthArchived()
  } catch {
    /* متوقفش الصفحة لو الأرشفة فشلت */
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const [
    { count: active },
    { count: paused },
    { count: teachers },
    { count: withdrawn },
    summary,
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'منسحب'),
    getDuesSummary(supabase, sp.month),
  ])

  const monthKey = summary.monthKey
  const monthLabel = monthLabelAr(monthKey)
  const collected = summary.collected
  const dueTotal = summary.dueTotal
  const dueCount = summary.dueCount

  const menu = [
    { href: '/admin/session-settle', icon: 'rule', title: 'تسوية حصص المعلم', desc: 'حذف/مزامنة حصص طالب مع معلم', color: '#ba1a1a' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × سعر · صرف/تسوية مالية', color: '#755b1b' },
    { href: '/admin/today', icon: 'today', title: 'جدول اليوم', desc: 'حصص النهارده عند كل المعلمين', color: '#176b52' },
    { href: '/admin/cumulative', icon: 'leaderboard', title: 'التقرير التراكمي', desc: 'ترتيب المعلمين بالدرجة المركبة', color: '#176b52' },
    { href: '/admin/courses', icon: 'school', title: 'الكورسات', desc: 'فيديوهات · صور · اشتراكات · تفعيل', color: '#755b1b' },
    { href: '/admin/landing', icon: 'web', title: 'اللاندنج بيدج', desc: 'تعديل الصفحة الرئيسية للموقع', color: '#755b1b' },
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
    { href: '/admin/cashbox', icon: 'savings', title: 'الصندوق', desc: 'دخل وصرف', color: '#176b52' },
    { href: '/admin/schedule', icon: 'calendar_month', title: 'الجدول', desc: 'مواعيد', color: '#3d665a' },
    { href: '/admin/fixed-schedule', icon: 'event_repeat', title: 'المواعيد الثابتة', desc: 'جدول ثابت', color: '#3d665a' },
    { href: '/admin/families', icon: 'family_restroom', title: 'العائلات', desc: 'أولياء', color: '#176b52' },
    { href: '/admin/supervisors', icon: 'supervisor_account', title: 'المشرفون', desc: 'إدارة', color: '#00513c' },
    { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'من الإدارة', color: '#755b1b' },
    { href: '/admin/supervisor-eval', icon: 'verified', title: 'تقييم الإشراف', desc: 'من الإدارة', color: '#755b1b' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'مدفوعات', color: '#3d665a' },
    { href: '/admin/students?status=%D9%85%D9%88%D9%82%D9%88%D9%81', icon: 'pause_circle', title: 'المتوقفين مؤقتًا', desc: 'للتواصل السريع', color: '#b45309' },
    { href: '/admin/students?status=%D9%85%D9%86%D8%B3%D8%AD%D8%A8', icon: 'person_off', title: 'المنسحبين', desc: 'أرشيف', color: '#6f7974' },
    { href: '/evaluate', icon: 'family_restroom', title: 'فورم أولياء الأمور', desc: 'بدون دخول', color: '#176b52' },
    { href: '/student', icon: 'school', title: 'بوابة الطالب', desc: 'مواعيد ومستحق بالكود', color: '#176b52' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أدوار', color: '#00513c' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف', color: '#3d665a' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حضور + تقييم الحصة', color: '#176b52' },
    { href: '/admin/more', icon: 'settings', title: 'المزيد', desc: 'خروج · المميزات', color: '#6f7974' },
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
            {monthLabel} — نظرة سريعة
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
              <a href={`/admin/monthly?month=${monthKey}`} style={{ color: '#176b52' }} className="font-bold">
                الملخص الشهري ←
              </a>
            </div>
          </div>
        </div>
      </div>

      <OpenSettleButtons />

      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-semibold" style={{ color: '#3f4944' }}>
            المميزات
          </p>
          <a href="/admin/features" className="text-[11px] font-bold" style={{ color: '#176b52' }}>
            اختيار الظاهر ←
          </a>
        </div>
        <FeatureMenuGrid role="admin" items={menu} />
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 max-w-lg mx-auto z-30"
        style={{ borderColor: '#cde8dc' }}
      >
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية' },
          { href: '/admin/session-settle', icon: 'rule', label: 'تسوية' },
          { href: '/admin/payroll', icon: 'payments', label: 'رواتب' },
          { href: '/admin/payments', icon: 'credit_card', label: 'دفع' },
          { href: '/admin/more', icon: 'more_horiz', label: 'المزيد' },
        ].map((i) => (
          <a key={i.href} href={i.href} className="flex flex-col items-center gap-0.5 px-2">
            <span className="material-symbols-outlined text-[22px]" style={{ color: '#176b52' }}>
              {i.icon}
            </span>
            <span className="text-[10px]" style={{ color: '#3f4944' }}>
              {i.label}
            </span>
          </a>
        ))}
      </nav>
    </div>
  )
}
