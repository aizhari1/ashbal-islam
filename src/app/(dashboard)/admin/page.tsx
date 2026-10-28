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
    { href: '/admin/monthly', icon: 'calendar_view_month', title: 'الملخص الشهري', desc: 'دخل · صرف · حصص · تقييمات', color: '#00513c' },
    { href: '/admin/notes', icon: 'sticky_note_2', title: 'الملاحظات', desc: 'ملاحظات الإدارة والإشراف', color: '#3d665a' },
    { href: '/admin/chat', icon: 'chat', title: 'شات المعلمين', desc: 'محادثة إدارة ↔ معلم', color: '#176b52' },
    { href: '/admin/students', icon: 'groups', title: 'إدارة شؤون الطلاب', desc: 'سجلات المتابعة', color: '#176b52' },
    { href: '/admin/students/new', icon: 'person_add', title: 'طالب جديد', desc: 'تسجيل واشتراك', color: '#176b52' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص أكتوبر', color: '#176b52' },
    { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء + إدارة', color: '#c5a45d' },
    { href: '/admin/schedule', icon: 'event', title: 'الحضور والتحضير', desc: 'أرشيف أكتوبر', color: '#3d665a' },
    { href: '/admin/fixed-schedule', icon: 'calendar_month', title: 'المواعيد الثابتة', desc: 'جدول + روابط Zoom', color: '#176b52' },
    { href: '/admin/families', icon: 'family_restroom', title: 'العائلات (الإخوة)', desc: 'تجميع بالهاتف', color: '#3d665a' },
    { href: '/admin/supervisor-eval', icon: 'military_tech', title: 'تقييم الإشراف', desc: 'نقاط شهرية', color: '#c5a45d' },
    { href: '/admin/finance', icon: 'receipt_long', title: 'متأخرات وتذكير', desc: 'المستحقات', color: '#c74747' },
    { href: '/admin/cashbox', icon: 'account_balance', title: 'الصندوق المالي', desc: 'إيرادات ومصروفات', color: '#176b52' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × 25', color: '#755b1b' },
    { href: '/admin/supervisors', icon: 'supervisor_account', title: 'رواتب الإشراف', desc: 'مدفوع ومتبقي', color: '#755b1b' },
    { href: '/admin/students?status=تجريبي', icon: 'how_to_reg', title: 'حصص تجريبية', desc: 'محتملون', color: '#3d665a' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'موقوفة مؤقتاً', desc: 'متوقفين', color: '#d49a35' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'المنسحبين', desc: 'أرشيف', color: '#6f7974' },
    { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'تقييم الإدارة', color: '#c5a45d' },
    { href: '/evaluate', icon: 'family_restroom', title: 'فورم أولياء الأمور', desc: 'بدون دخول', color: '#176b52' },
    { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أدوار', color: '#00513c' },
    { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف', color: '#3d665a' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حضور وحفظ', color: '#176b52' },
    { href: '/admin/more', icon: 'settings', title: 'المزيد', desc: 'خروج', color: '#6f7974' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#176b52' }}>
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>الإدارة</p>
            <h1 className="text-[15px] font-bold" style={{ color: '#00513c' }}>أكاديمية أشبال الإسلام</h1>
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
            <p className="text-[22px] font-bold" style={{ color: '#00513c' }}>{s.value}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 mb-4">
        <div className="card p-4">
          <p className="text-[13px] font-bold mb-2">لمحة مالية</p>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <div><span style={{ color: '#6f7974' }}>قبضنا</span><p className="font-bold" style={{ color: '#176b52' }}>{collected.toLocaleString('ar-EG')}</p></div>
            <div><span style={{ color: '#6f7974' }}>مستحقات</span><p className="font-bold" style={{ color: '#ba1a1a' }}>{dueTotal.toLocaleString('ar-EG')}</p></div>
            <div><span style={{ color: '#6f7974' }}>منسحب</span><p className="font-bold">{withdrawn ?? 0}</p></div>
            <div><Link href="/admin/monthly" style={{ color: '#176b52' }} className="font-bold">الملخص الشهري ←</Link></div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-2 gap-2.5">
          {menu.map((m) => (
            <Link key={m.href + m.title} href={m.href} className="card p-3.5 flex flex-col gap-1 min-h-[92px]">
              <span className="material-symbols-outlined text-[22px]" style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[13px] font-bold">{m.title}</span>
              <span className="text-[11px]" style={{ color: '#6f7974' }}>{m.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <nav className="bottom-nav">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية', active: true },
          { href: '/admin/chat', icon: 'chat', label: 'شات' },
          { href: '/admin/monthly', icon: 'calendar_view_month', label: 'ملخص' },
          { href: '/admin/notes', icon: 'sticky_note_2', label: 'ملاحظات' },
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
