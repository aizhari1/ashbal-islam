import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()

  let active = 0
  let sessions = 0
  if (teacher) {
    const { count: a } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id).eq('status', 'نشط')
    const { count: s } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id).eq('status', 'حاضر')
    active = a ?? 0
    sessions = s ?? 0
  }

  const cards = [
    { href: '/teacher/students', icon: 'groups', title: 'طلابي', desc: 'تسجيل حضور سريع بعد كل حصة' },
    { href: '/teacher/schedule', icon: 'calendar_month', title: 'جدولي', desc: 'مواعيد حصصي القادمة' },
    { href: '/teacher/dues', icon: 'payments', title: 'مستحقاتي', desc: 'كشف الحصص والمبلغ المستحق' },
    { href: '/teacher/ratings', icon: 'star', title: 'تقييماتي', desc: 'تقييمات أولياء الأمور + الإدارة' },
    { href: '/teacher/attendance', icon: 'menu_book', title: 'سجل حصصي', desc: 'آخر حصص مسجّلة' },
    { href: '/teacher/session', icon: 'mic', title: 'تسجيل حضور', desc: 'غرفة التسميع والحفظ' },
    { href: '/teacher/note', icon: 'edit_note', title: 'ملاحظة للإدارة', desc: 'ابعث طلب أو ملاحظة' },
  ]

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <div className="bg-[#0d9b8a] text-white px-4 pt-4 pb-8">
        <div className="flex justify-between items-start">
          <Link href="/login" className="text-[12px] opacity-90">خروج</Link>
          <div className="text-left">
            <h1 className="text-[18px] font-bold">أشبال الإسلام</h1>
            <p className="text-[12px] opacity-90">أهلاً، {profile?.full_name || teacher?.name || 'معلم'}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 text-center mt-6">
          <div>
            <p className="text-[22px] font-bold">—</p>
            <p className="text-[10px] opacity-90">حصة تجريبية</p>
          </div>
          <div className="border-x border-white/25">
            <p className="text-[22px] font-bold">{sessions}</p>
            <p className="text-[10px] opacity-90">حصة مسجّلة</p>
          </div>
          <div>
            <p className="text-[22px] font-bold">{active}</p>
            <p className="text-[10px] opacity-90">طالب نشط</p>
          </div>
        </div>
      </div>

      <main className="px-3 -mt-4 pb-24">
        <div className="bg-white rounded-3xl p-3 shadow-sm grid grid-cols-2 gap-2">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}
              className="bg-[#fafaf8] rounded-2xl p-3.5 flex flex-col gap-1 min-h-[96px] border border-[#eee]">
              <span className="material-symbols-outlined text-[22px] text-[#0d9b8a]">{c.icon}</span>
              <span className="text-[13px] font-bold">{c.title}</span>
              <span className="text-[11px] text-[#6f7974] leading-snug">{c.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
