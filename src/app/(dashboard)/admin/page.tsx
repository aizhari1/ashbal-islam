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

  const collected = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const dueTotal = (dues ?? []).reduce((s: number, d: any) => s + Number(d.amount_due || 0), 0)

  const menu = [
    { href: '/admin/students', icon: 'groups', title: 'إدارة شؤون الطلاب', desc: 'سجلات المتابعة والطلاب', color: '#176b52' },
    { href: '/admin/students/new', icon: 'person_add', title: 'طالب جديد', desc: 'تسجيل واشتراك', color: '#176b52' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص أكتوبر والإحصائيات', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء الأمور والإدارة', color: '#c5a45d' },
    { href: '/admin/schedule', icon: 'event', title: 'الحضور والتحضير', desc: 'أرشيف حصص أكتوبر', color: '#3d665a' },
    { href: '/admin/finance', icon: 'receipt_long', title: 'متأخرات وتذكير', desc: 'المستحقات والمدفوعات', color: '#c74747' },
    { href: '/admin/cashbox', icon: 'account_balance', title: 'الصندوق المالي', desc: 'إيرادات ومصروفات', color: '#176b52' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × 25 ج.م', color: '#755b1b' },
    { href: '/admin/supervisors', icon: 'supervisor_account', title: 'رواتب الإشراف', desc: 'مدفوع ومتبقي', color: '#755b1b' },
    { href: '/admin/students?status=تجريبي', icon: 'how_to_reg', title: 'حصص تجريبية', desc: 'طلاب محتملون', color: '#3d665a' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'موقوفة مؤقتاً', desc: 'إجازات ومتوقفين', color: '#d49a35' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'المنسحبين', desc: 'أرشيف الانسحاب', color: '#6f7974' },
    { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'تقييم الإدارة', color: '#c5a45d' },
    { href: '/evaluate', icon: 'family_restroom', title: 'فورم أولياء الأمور', desc: 'تقييم عام بدون دخول', color: '#176b52' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أكواد وأدوار', color: '#00513c' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف الباقات', color: '#3d665a' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حضور وحفظ', color: '#176b52' },
    { href: '/admin/more', icon: 'settings', title: 'المزيد', desc: 'خروج وإعدادات', color: '#6f7974' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#176b52' }}>
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: '#6f7974' }}>الإدارة</p>
            <h1 className="text-[15px] font-bold leading-tight" style={{ color: '#00513c' }}>أكاديمية أشبال الإسلام</h1>
          </div>
        </div>
        <Link href="/admin/more" className="w-9 h-9 rounded-full bg-white flex items-center justify-center" style={{ border: '1px solid rgba(18,61,50,0.08)' }}>
          <span className="material-symbols-outlined text-[20px]" style={{ color: '#3f4944' }}>notifications</span>
        </Link>
      </header>

      <div className="px-4 mt-2 mb-4">
        <div className="card p-4" style={{ background: 'linear-gradient(135deg, #176b52 0%, #00513c 100%)', border: 'none' }}>
          <div className="flex items-start justify-between text-white">
            <div>
              <p className="text-[12px] opacity-80">مرحباً</p>
              <h2 className="text-[18px] font-bold mt-0.5">{profile?.full_name || 'الإدارة'}</h2>
              <span className="inline-flex items-center gap-1 mt-2 text-[11px] bg-white/15 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                مدير الأكاديمية
              </span>
            </div>
            <span className="material-symbols-outlined text-4xl opacity-30">school</span>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'طالب نشط', value: active ?? 0, icon: 'school' },
          { label: 'متوقف', value: paused ?? 0, icon: 'pause_circle' },
          { label: 'معلم', value: teachers ?? 0, icon: 'record_voice_over' },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <span className="material-symbols-outlined text-[22px]" style={{ color: '#176b52' }}>{s.icon}</span>
            <p className="text-[22px] font-bold leading-none mt-1" style={{ color: '#00513c' }}>{s.value}</p>
            <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 mb-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold">لمحة مالية</h3>
            <Link href="/admin/cashbox" className="text-[11px] font-semibold" style={{ color: '#176b52' }}>الصندوق ←</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>قبضنا</p>
              <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{collected.toLocaleString('ar-EG')}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>مستحقات</p>
              <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{dueTotal.toLocaleString('ar-EG')}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>منسحب</p>
              <p className="text-[16px] font-bold">{withdrawn ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>التقارير</p>
              <Link href="/admin/reports" className="text-[13px] font-bold" style={{ color: '#176b52' }}>فتح</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <h3 className="text-[13px] font-bold mb-2 px-1" style={{ color: '#3f4944' }}>القائمة الرئيسية</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {menu.map((m) => (
            <Link key={m.href + m.title} href={m.href} className="card p-3.5 flex flex-col gap-1.5 min-h-[96px]">
              <span className="material-symbols-outlined text-[24px]" style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[13px] font-bold leading-snug">{m.title}</span>
              <span className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>{m.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية', active: true },
          { href: '/admin/students/new', icon: 'person_add', label: 'إضافة' },
          { href: '/admin/reports', icon: 'analytics', label: 'تقارير' },
          { href: '/admin/schedule', icon: 'event', label: 'تحضير' },
          { href: '/admin/students', icon: 'groups', label: 'الطلاب' },
        ].map((n: any) => (
          <Link key={n.label} href={n.href} className={n.active ? 'active' : ''}>
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
