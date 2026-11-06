import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentMonthKey, monthLabelAr } from '@/lib/dues'
import { getDuesSummary } from '@/lib/dues-engine'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { LogoutButton } from '@/components/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function SupervisorDashboard({
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

  const { data: profile } = await supabase.from('profiles').select('full_name, role, code').eq('id', user.id).single()

  if (profile && !['supervisor', 'admin'].includes(profile.role || '')) redirect('/login')

  const [{ count: active }, { count: paused }, { count: trial }, { count: scheduleCount }, summary] =
    await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'تجريبي'),
      supabase.from('schedule_entries').select('*', { count: 'exact', head: true }),
      getDuesSummary(supabase, sp.month),
    ])

  const monthKey = summary.monthKey
  const monthLabel = monthLabelAr(monthKey)
  const isCurrentMonth = monthKey === currentMonthKey()
  const collected = summary.collected
  const dueTotal = summary.dueTotal
  const dueCount = summary.dueCount
  const duesList = summary.topDues

  const menu = [
    { href: '/supervisor/edit-student', icon: 'edit', title: 'تعديل بيانات طالب', desc: 'بحث + اسم واشتراك وسعر', color: '#176b52' },
    { href: '/supervisor/edit-session', icon: 'pin', title: 'تعديل رقم الحصة', desc: 'بحث فوري · حفظ مع المزامنة', color: '#176b52' },
    { href: '/admin/students', icon: 'groups', title: 'قائمة كل الطلاب', desc: 'كل المسجلين مع التفاصيل', color: '#176b52' },
    { href: '/supervisor/payment', icon: 'credit_card', title: 'تسجيل اشتراك (دفعة)', desc: 'إنستا · فودافون · بنكي', color: '#c5a45d' },
    { href: '/admin/fixed-schedule', icon: 'calendar_month', title: 'تعديل مواعيد الحلقات', desc: `${scheduleCount ?? 0} موعد ثابت`, color: '#3d665a' },
    { href: '/admin/finance', icon: 'notifications_active', title: 'تذكير بالمستحقات', desc: 'تقرير مالي وتذكير بالدفع', color: '#ba1a1a' },
    { href: '/supervisor/status', icon: 'check_circle', title: 'تغيير حالة الطالب', desc: 'انسحاب / توقف / رجوع', color: '#176b52' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'قائمة المنسحبين', desc: 'أرشيف الانسحاب', color: '#6f7974' },
    { href: '/supervisor/my-evals', icon: 'star', title: 'تقييماتي ونقاطي', desc: 'نقاط الشهر وتقييم الإدارة', color: '#c5a45d' },
    { href: '/admin/trials', icon: 'science', title: 'الحصص التجريبية', desc: 'متابعة المحتملين', color: '#3d665a' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'المتوقفين مؤقتًا', desc: 'للتواصل السريع', color: '#d49a35' },
    { href: '/admin/notes', icon: 'edit_note', title: 'ملاحظة للإدارة', desc: 'مشكلة أو بلاغ سريع', color: '#3d665a' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'كل الدفعات المسجّلة', color: '#176b52' },
    { href: '/admin/students/new?trial=1', icon: 'person_add', title: 'إضافة طالب تجريبي', desc: 'حصة تجريبية مستقلة', color: '#3d665a' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب مشترك', desc: 'بيانات + مواعيد ثابتة', color: '#176b52' },
    { href: '/admin/teacher-absences', icon: 'event_busy', title: 'غيابات المعلمين', desc: 'تسجيل وعرض', color: '#b45309' },
    { href: '/admin/schedule', icon: 'event_available', title: 'الحضور والتحضير', desc: 'أرشيف الحصص', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'تقييمات أولياء الأمور', desc: 'عرض التقييمات', color: '#c5a45d' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#176b52' }}>
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified_user
            </span>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              الإشراف
            </p>
            <h1 className="text-[15px] font-bold" style={{ color: '#00513c' }}>
              أكاديمية أشبال الإسلام
            </h1>
          </div>
        </div>
        <LogoutButton compact label="خروج" />
      </header>

      <div className="px-4 mt-2 mb-4">
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, #176b52, #00513c)', border: 'none' }}>
          <p className="text-white text-[12px] opacity-80">مرحباً</p>
          <h2 className="text-white text-[18px] font-bold">{profile?.full_name || 'مشرف'}</h2>
          {profile?.code && <p className="text-white text-[11px] opacity-70 mt-0.5">كود: {profile.code}</p>}
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[12px]" style={{ color: '#6f7974' }}>
              {monthLabel} — نظرة سريعة{!isCurrentMonth ? ' (شهر سابق)' : ''}
            </p>
            <MonthSwitcher current={monthKey} basePath="/supervisor" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <div>
              <span style={{ color: '#6f7974' }}>محصّل: </span>
              <b style={{ color: '#176b52' }}>{collected.toLocaleString('ar-EG')} ج</b>
            </div>
            <div>
              <span style={{ color: '#6f7974' }}>مستحق: </span>
              <b style={{ color: '#ba1a1a' }}>
                {dueTotal.toLocaleString('ar-EG')} ج ({dueCount})
              </b>
            </div>
          </div>
          {duesList.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-bold" style={{ color: '#3f4944' }}>
                أعلى مستحقات
              </p>
              {duesList.map((s) => (
                <Link
                  key={s.id}
                  href={`/supervisor/edit-student?id=${s.id}`}
                  className="flex justify-between text-[12px] gap-2"
                >
                  <span className="truncate">{s.name}</span>
                  <b style={{ color: '#ba1a1a' }}>{Number(s.amount_due).toLocaleString('ar-EG')}</b>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'نشط', value: active ?? 0, color: '#176b52' },
          { label: 'متوقف', value: paused ?? 0, color: '#d49a35' },
          { label: 'تجريبي', value: trial ?? 0, color: '#3d665a' },
          { label: 'مواعيد', value: scheduleCount ?? 0, color: '#176b52' },
        ].map((s) => (
          <div key={s.label} className="card p-2.5 text-center">
            <p className="text-[18px] font-bold leading-none" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="px-4">
        <h3 className="text-[13px] font-bold mb-2.5 px-1" style={{ color: '#3f4944' }}>
          القائمة الرئيسية
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {menu.map((m) => (
            <Link key={m.title} href={m.href} className="card p-3.5 flex flex-col gap-1.5 min-h-[108px]">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center material-symbols-outlined text-[20px]"
                style={{ background: '#e8f7f0', color: m.color }}
              >
                {m.icon}
              </span>
              <span className="text-[13px] font-bold leading-snug">{m.title}</span>
              <span className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>
                {m.desc}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 mb-6">
        <LogoutButton />
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/supervisor', icon: 'home', label: 'الرئيسية', active: true },
          { href: '/admin/students/new', icon: 'person_add', label: 'إضافة' },
          { href: '/admin/students', icon: 'groups', label: 'الطلاب' },
          { href: '/supervisor/payment', icon: 'payments', label: 'دفعة' },
          { href: '/admin/fixed-schedule', icon: 'calendar_month', label: 'مواعيد' },
        ].map((n) => (
          <Link key={n.label} href={n.href} className={n.active ? 'active' : ''}>
            <span
              className="material-symbols-outlined text-[22px]"
              style={n.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {n.icon}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
