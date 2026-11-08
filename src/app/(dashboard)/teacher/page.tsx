import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentMonthKey, monthBounds, monthLabelAr } from '@/lib/dues'

export const dynamic = 'force-dynamic'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()

  const monthKey = currentMonthKey()
  const { start, end } = monthBounds(monthKey)

  let active = 0,
    sessions = 0,
    trials = 0
  if (teacher) {
    const { count: a } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('status', 'نشط')
    // حصص الشهر الحالي فقط
    const { count: s } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .in('status', ['حاضر', 'متأخر'])
      .gte('session_date', start)
      .lte('session_date', end)
    const { count: tr } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacher.id)
      .eq('status', 'تجريبي')
    trials = tr ?? 0
    active = a ?? 0
    sessions = s ?? 0
  }

  const cards = [
    { href: '/teacher/students', icon: 'groups', title: 'طلابي', desc: 'تسجيل حضور بعد كل حصة' },
    { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حفظ ومراجعة وتجويد' },
    { href: '/teacher/schedule', icon: 'calendar_month', title: 'جدولي', desc: 'مواعيد الحصص' },
    { href: '/teacher/dues', icon: 'payments', title: 'مستحقاتي', desc: `كشف ${monthLabelAr(monthKey)}` },
    { href: '/teacher/ratings', icon: 'star', title: 'تقييماتي', desc: 'أولياء الأمور والإدارة' },
    { href: '/teacher/trials', icon: 'person_add', title: 'حصصي التجريبية', desc: 'تقرير التجربة والاشتراك' },
    { href: '/teacher/attendance', icon: 'menu_book', title: 'سجل حصصي', desc: monthLabelAr(monthKey) },
    { href: '/teacher/chat', icon: 'chat', title: 'محادثة الإدارة', desc: 'استقبال والرد على الإدارة' },
    { href: '/teacher/note', icon: 'edit_note', title: 'ملاحظة للإدارة', desc: 'طلب أو ملاحظة' },
  ]

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-8 dash-page">
      <div className="px-4 pt-5 pb-6 dash-hero">
        <div className="flex justify-between items-start text-white mb-5">
          <Link href="/login" className="text-[12px] opacity-80">
            خروج
          </Link>
          <div className="text-left">
            <h1 className="text-[18px] font-bold text-white">أشبال الإسلام</h1>
            <p className="text-[12px] opacity-85 mt-0.5 text-white">
              أهلاً، {profile?.full_name || teacher?.name || 'معلم'}
            </p>
            <p className="text-[11px] opacity-70 mt-0.5 text-white">{monthLabelAr(monthKey)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 text-center text-white">
          <div>
            <p className="text-[24px] font-bold text-white">{trials}</p>
            <p className="text-[10px] opacity-80 mt-1 text-white">تجريبية</p>
          </div>
          <div className="border-x border-white/20">
            <p className="text-[24px] font-bold text-white">{sessions}</p>
            <p className="text-[10px] opacity-80 mt-1 text-white">حصة هذا الشهر</p>
          </div>
          <div>
            <p className="text-[24px] font-bold text-white">{active}</p>
            <p className="text-[10px] opacity-80 mt-1 text-white">طالب نشط</p>
          </div>
        </div>
      </div>

      <main className="px-3 -mt-3">
        <div className="card p-2 grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="dash-tile rounded-2xl p-3.5 flex flex-col gap-1 min-h-[100px]">
              <span className="material-symbols-outlined text-[24px] dash-tile-icon">{c.icon}</span>
              <span className="text-[13px] font-bold dash-tile-title">{c.title}</span>
              <span className="text-[11px] dash-tile-desc">{c.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
