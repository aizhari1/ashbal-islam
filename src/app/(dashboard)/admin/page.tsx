import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/LogoutButton'
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
    { href: '/admin/income', icon: 'trending_up', title: 'تحليل الدخل', desc: 'زاد ولا نقص · تحليل كل طالب بالفترة', color: '#176b52' },
    { href: '/admin/session-settle', icon: 'rule', title: 'حصص المعلم عند طالب', desc: 'تبويب مستقل · حذف حصة غلط · إضافة منسية', color: '#ba1a1a' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × سعر · صرف/تسوية مالية', color: '#755b1b' },
    { href: '/admin/certificates', icon: 'workspace_premium', title: 'شهادات التقدير', desc: 'قوالب متعددة · تُرسل للطالب واتساب', color: '#755b1b' },
    { href: '/admin/today', icon: 'today', title: 'جدول اليوم', desc: 'حصص النهارده عند كل المعلمين', color: '#176b52' },
    { href: '/admin/cumulative', icon: 'leaderboard', title: 'التقرير التراكمي', desc: 'ترتيب المعلمين بالدرجة المركبة', color: '#176b52' },
    { href: '/admin/courses', icon: 'school', title: 'الكورسات', desc: 'فيديوهات · صور · اشتراكات · تفعيل', color: '#755b1b' },
    { href: '/admin/landing', icon: 'web', title: 'اللاندنج بيدج', desc: 'تعديل الصفحة الرئيسية للموقع', color: '#755b1b' },
    { href: `/admin/monthly?month=${monthKey}`, icon: 'calendar_view_month', title: 'الملخص الشهري', desc: 'دخل · صرف · حصص · تقييمات', color: '#00513c' },
    { href: '/admin/sessions-detail', icon: 'list_alt', title: 'تفاصيل الحصص', desc: 'لكل معلم · طلاب · سعر ومدة', color: '#00513c' },
    { href: '/admin/payments', icon: 'credit_card', title: 'المدفوعات', desc: 'إنستا · فودافون · بنكي', color: '#755b1b' },
    { href: '/admin/activity', icon: 'history', title: 'سجل النشاط', desc: 'كل التغييرات في تايم لاين', color: '#3d665a' },
    { href: '/admin/teacher-absences', icon: 'event_busy', title: 'غيابات المعلمين', desc: 'المسجّلة من الإشراف', color: '#b45309' },
    { href: '/admin/analytics', icon: 'bar_chart', title: 'تحليلات الباقات', desc: 'أكثر وأقل باقة · نسب', color: '#176b52' },
    { href: '/admin/notes', icon: 'sticky_note_2', title: 'الملاحظات', desc: 'ملاحظات الإدارة والإشراف', color: '#3d665a' },
    { href: '/admin/chat', icon: 'chat', title: 'شات المعلمين', desc: 'محادثة إدارة ↔ معلم', color: '#176b52' },
    { href: '/admin/students', icon: 'groups', title: 'إدارة شؤون الطلاب', desc: 'كل الطلاب · الحالة · التعديل · النقل · التجريبي', color: '#176b52' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب', desc: 'تجريبي أو مشترك فعلي', color: '#176b52' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخصات وإحصائيات', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء الأمور + تقييم الإدارة', color: '#176b52' },
    { href: '/admin/finance', icon: 'payments', title: 'التذكير المالي', desc: 'مستحقات · تذكير', color: '#755b1b' },
    { href: '/admin/cashbox', icon: 'savings', title: 'الصندوق', desc: 'دخل وصرف', color: '#755b1b' },
    { href: '/admin/schedule', icon: 'calendar_month', title: 'الجدول', desc: 'مواعيد الحلقات', color: '#176b52' },
    { href: '/admin/fixed-schedule', icon: 'event_repeat', title: 'المواعيد الثابتة', desc: 'جدول ثابت', color: '#176b52' },
    { href: '/admin/families', icon: 'family_restroom', title: 'العائلات', desc: 'أولياء الأمور', color: '#176b52' },
    { href: '/admin/supervisors', icon: 'supervisor_account', title: 'المشرفون', desc: 'إدارة المشرفين', color: '#176b52' },
    { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'من الإدارة', color: '#176b52' },
    { href: '/admin/supervisor-eval', icon: 'verified', title: 'تقييم الإشراف', desc: 'من الإدارة', color: '#176b52' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'مدفوعات الباقات', color: '#755b1b' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أدوار وصلاحيات', color: '#3d665a' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف الباقات', color: '#176b52' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold" style={{ color: '#00513c' }}>
            لوحة الإدارة
          </h1>
          <p className="text-[12px]" style={{ color: '#6f7974' }}>
            {profile?.full_name || 'مسؤول'} · أشبال الإسلام
          </p>
        </div>
        <LogoutButton compact label="خروج" />
      </header>

      <div className="px-4 mb-4 grid grid-cols-3 gap-2">
        {[
          { label: 'نشط', value: active ?? 0, color: '#176b52' },
          { label: 'موقوف', value: paused ?? 0, color: '#b45309' },
          { label: 'معلمون', value: teachers ?? 0, color: '#00513c' },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[20px] font-bold" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
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
              <b style={{ color: '#176b52' }}>{collected.toLocaleString('en-US')} ج</b>
            </div>
            <div>
              <span style={{ color: '#6f7974' }}>مستحق: </span>
              <b style={{ color: '#b45309' }}>
                {dueTotal.toLocaleString('en-US')} ج ({dueCount})
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
          { href: '/admin/session-settle', icon: 'rule', label: 'حصص معلم' },
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
