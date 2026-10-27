import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SupervisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile && !['supervisor', 'admin'].includes(profile.role)) redirect('/login')

  const [
    { count: active },
    { count: paused },
    { count: withdrawn },
    { count: trial },
    { data: dues },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'منسحب'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'تجريبي'),
    supabase.from('students').select('amount_due').gt('amount_due', 0),
  ])
  const dueTotal = (dues ?? []).reduce((s: number, d: any) => s + Number(d.amount_due || 0), 0)

  const cards = [
    { href: '/admin/students', icon: 'groups', title: 'قائمة كل الطلاب', desc: 'كل المسجلين مع التفاصيل' },
    { href: '/admin/students/new', icon: 'person_add', title: 'إضافة طالب مشترك', desc: 'بيانات + مواعيد' },
    { href: '/admin/students?status=تجريبي', icon: 'science', title: 'الحصص التجريبية', desc: 'متابعة المحتملين' },
    { href: '/admin/students?status=موقوف', icon: 'pause_circle', title: 'المتوقفين مؤقتاً', desc: 'للتواصل السريع' },
    { href: '/admin/students?status=منسحب', icon: 'person_off', title: 'المنسحبين', desc: 'أرشيف الانسحاب' },
    { href: '/admin/finance', icon: 'payments', title: 'تذكير بالمستحقات', desc: 'مين محتاج تذكير بالدفع' },
    { href: '/admin/schedule', icon: 'event_available', title: 'الحضور والتحضير', desc: 'سجلات الحصص' },
    { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص وإحصائيات' },
    { href: '/admin/evaluations', icon: 'star', title: 'التقييمات', desc: 'أولياء الأمور والإدارة' },
    { href: '/evaluate', icon: 'family_restroom', title: 'فورم ولي الأمر', desc: 'رابط التقييم العام' },
    { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'رواتب المعلمين', desc: 'حصص أكتوبر × 25' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'تسجيل حضور' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <div className="px-4 pt-5 pb-6" style={{ background: 'linear-gradient(160deg, #176b52, #00513c)' }}>
        <div className="flex justify-between text-white mb-4">
          <Link href="/login" className="text-[12px] opacity-80">خروج</Link>
          <div className="text-left">
            <h1 className="text-[18px] font-bold">أشبال الإسلام</h1>
            <p className="text-[12px] opacity-85">تطبيق الإشراف · {profile?.full_name || 'مشرف'}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 text-center text-white gap-1">
          {[
            { v: active ?? 0, l: 'نشط' },
            { v: paused ?? 0, l: 'متوقف' },
            { v: trial ?? 0, l: 'تجريبي' },
            { v: withdrawn ?? 0, l: 'منسحب' },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-[20px] font-bold">{s.v}</p>
              <p className="text-[10px] opacity-80">{s.l}</p>
            </div>
          ))}
        </div>
        {dueTotal > 0 && (
          <p className="text-center text-white/90 text-[12px] mt-3">مستحقات مفتوحة: {dueTotal.toLocaleString('ar-EG')} ج.م</p>
        )}
      </div>

      <main className="px-3 -mt-3">
        <div className="card p-2 grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <Link key={c.href + c.title} href={c.href} className="rounded-2xl p-3.5 min-h-[96px] flex flex-col gap-1" style={{ background: '#fafaf8' }}>
              <span className="material-symbols-outlined text-[22px]" style={{ color: '#176b52' }}>{c.icon}</span>
              <span className="text-[13px] font-bold">{c.title}</span>
              <span className="text-[11px]" style={{ color: '#6f7974' }}>{c.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
