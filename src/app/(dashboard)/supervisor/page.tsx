import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SupervisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, code')
    .eq('id', user.id)
    .single()

  if (profile && !['supervisor', 'admin'].includes(profile.role)) redirect('/login')

  const [
    { count: active },
    { count: paused },
    { count: trial },
    { count: withdrawn },
    { data: dues },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'تجريبي'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'منسحب'),
    supabase.from('students').select('amount_due').gt('amount_due', 0).limit(200),
  ])

  const dueTotal = (dues ?? []).reduce((s: number, d: any) => s + Number(d.amount_due || 0), 0)
  const dueCount = dues?.length ?? 0

  const menu = [
    { href: '/admin/students', icon: 'edit', title: 'تعديل بيانات طالب', desc: 'الاسم، الاشتراك، سعر الحصة', color: '#176b52' },
    { href: '/admin/students', icon: 'groups', title: 'قائمة كل الطلاب', desc: 'كل المسجلين مع التفاصيل', color: '#176b52' },
    { href: '/admin/finance', icon: 'credit_card', title: 'تسجيل اشتراك (دفعة)', desc: 'طريقة الدفع والمبلغ', color: '#c5a45d' },
    { href: '/admin/fixed-schedule', icon: 'calendar_month', title: 'تعديل مواعيد الحلقات', desc: 'مواعيد ثابتة + روابط', color: '#3d665a' },
    { href: '/admin/finance', icon: 'notifications_active', title: 'تذكير بالمستحقات', desc: 'تقرير مالي وتذكير بالدفع', color: '#ba1a1a' },
    { href: '/admin/students', icon: 'check_circle', title: 'تغيير حالة الطالب', desc: 'انسحاب / توقف / رجوع', color: '#176b52' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'قائمة المنسحبين', desc: 'أرشيف الانسحاب', color: '#6f7974' },
    { href: '/admin/supervisor-eval', icon: 'star', title: 'تقييماتي ونقاطي', desc: 'نقاط الشهر وتقييم الإدارة', color: '#c5a45d' },
    { href: '/admin/students?status=تجريبي', icon: 'science', title: 'الحصص التجريبية', desc: 'متابعة المحتملين', color: '#3d665a' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'المتوقفين مؤقتًا', desc: 'للتواصل السريع', color: '#d49a35' },
    { href: '/admin/notes', icon: 'edit_note', title: 'ملاحظة للإدارة', desc: 'مشكلة أو بلاغ سريع', color: '#3d665a' },
    { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'كل الدفعات المسجّلة', color: '#176b52' },
    { href: '/admin/students/new?trial=1', icon: 'person_add', title: 'إضافة طالب تجريبي', desc: 'حصة تجريبية مستقلة', color: '#3d665a' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب مشترك', desc: 'بيانات + مواعيد ثابتة', color: '#176b52' },
    { href: '/admin/transfer', icon: 'swap_horiz', title: 'نقل طالب / معلم', desc: 'تحويل لمعلم آخر', color: '#755b1b' },
    { href: '/admin/schedule', icon: 'event_available', title: 'الحضور والتحضير', desc: 'أرشيف حصص أكتوبر', color: '#176b52' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص وإحصائيات', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء الأمور', color: '#c5a45d' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
          >
            <span className="material-symbols-outlined text-white text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              supervisor_account
            </span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: '#6f7974' }}>تطبيق الإشراف</p>
            <h1 className="text-[15px] font-bold leading-tight" style={{ color: '#00513c' }}>
              أكاديمية أشبال الإسلام
            </h1>
          </div>
        </div>
        <Link
          href="/login"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center"
          style={{ border: '1px solid rgba(18,61,50,0.08)' }}
          title="خروج"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ color: '#3f4944' }}>logout</span>
        </Link>
      </header>

      <div className="px-4 mt-2 mb-4">
        <div
          className="rounded-2xl p-4 text-white"
          style={{ background: 'linear-gradient(135deg, #176b52 0%, #00513c 100%)', boxShadow: '0 8px 24px rgba(23,107,82,0.25)' }}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[12px] opacity-85">مرحباً</p>
              <h2 className="text-[18px] font-bold mt-0.5">{profile?.full_name || 'مشرف'}</h2>
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] bg-white/15 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                مشرف الأكاديمية
                {profile?.code ? ` · ${profile.code}` : ''}
              </span>
            </div>
            <span className="material-symbols-outlined text-5xl opacity-20" style={{ fontVariationSettings: "'FILL' 1" }}>
              school
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'نشط', value: active ?? 0, color: '#176b52' },
          { label: 'متوقف', value: paused ?? 0, color: '#d49a35' },
          { label: 'تجريبي', value: trial ?? 0, color: '#3d665a' },
          { label: 'منسحب', value: withdrawn ?? 0, color: '#ba1a1a' },
        ].map((s) => (
          <div key={s.label} className="card p-2.5 text-center">
            <p className="text-[18px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {(dueCount > 0 || dueTotal > 0) && (
        <div className="px-4 mb-4">
          <Link href="/admin/finance" className="card p-3.5 flex items-center justify-between block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#ffdad6' }}>
                <span className="material-symbols-outlined" style={{ color: '#ba1a1a' }}>payments</span>
              </div>
              <div>
                <p className="text-[13px] font-bold">مستحقات مفتوحة</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>{dueCount} طالب يحتاج تذكير</p>
              </div>
            </div>
            <p className="text-[15px] font-bold" style={{ color: '#ba1a1a' }}>{dueTotal.toLocaleString('ar-EG')}</p>
          </Link>
        </div>
      )}

      <div className="px-4">
        <h3 className="text-[13px] font-bold mb-2.5 px-1" style={{ color: '#3f4944' }}>القائمة الرئيسية</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {menu.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="card p-3.5 flex flex-col gap-1.5 min-h-[108px] active:scale-[0.98] transition-transform"
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center material-symbols-outlined text-[20px]"
                style={{ background: '#e8f7f0', color: m.color }}
              >
                {m.icon}
              </span>
              <span className="text-[13px] font-bold leading-snug" style={{ color: '#111e1a' }}>{m.title}</span>
              <span className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>{m.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/supervisor', icon: 'home', label: 'الرئيسية', active: true },
          { href: '/admin/students/new', icon: 'person_add', label: 'إضافة' },
          { href: '/admin/students', icon: 'groups', label: 'الطلاب' },
          { href: '/admin/finance', icon: 'payments', label: 'مستحقات' },
          { href: '/admin/fixed-schedule', icon: 'calendar_month', label: 'مواعيد' },
        ].map((n) => (
          <Link key={n.label} href={n.href} className={n.active ? 'active' : ''}>
            <span className="material-symbols-outlined text-[22px]" style={n.active ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              {n.icon}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
