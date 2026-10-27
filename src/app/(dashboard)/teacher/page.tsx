import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()

  let students: { id: string; code: string; name: string; status: string; amount_due: number }[] = []
  if (teacher) {
    const { data } = await supabase.from('students').select('id, code, name, status, amount_due').eq('teacher_id', teacher.id).order('name')
    students = data ?? []
  }
  const active = students.filter(s => s.status === 'نشط').length

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#eefdf6]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[12px] text-[#6f7974]">لوحة المعلم</p>
          <h1 className="text-[16px] font-bold text-[#00513c]">{profile?.full_name || 'معلم'}</h1>
        </div>
        <Link href="/teacher/session" className="bg-[#176b52] text-white text-[12px] font-bold px-3 py-2 rounded-full">غرفة التسميع</Link>
      </header>
      <main className="px-4 pb-24">
        <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[22px] font-bold">{students.length}</p>
            <p className="text-[12px] text-[#6f7974]">إجمالي الطلاب</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[22px] font-bold text-[#176b52]">{active}</p>
            <p className="text-[12px] text-[#6f7974]">نشط</p>
          </div>
        </div>
        <h2 className="text-[14px] font-bold mb-2">طلابي</h2>
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-3.5 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e8f7f0] flex items-center justify-center text-[#176b52] font-bold">{s.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{s.name}</p>
                <p className="text-[11px] text-[#6f7974]">{s.code} · {s.status}</p>
              </div>
            </div>
          ))}
          {students.length === 0 && <div className="bg-white rounded-2xl p-6 text-center text-[#6f7974]">لا يوجد طلاب مرتبطون بحسابك بعد</div>}
        </div>
      </main>
      <nav className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white border-t flex justify-around py-2">
        {[
          { href: '/teacher', icon: 'home', label: 'الرئيسية' },
          { href: '/teacher/students', icon: 'school', label: 'الطلاب' },
          { href: '/teacher/session', icon: 'mic', label: 'تسميع' },
          { href: '/teacher/schedule', icon: 'calendar_month', label: 'الجدول' },
        ].map(n => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center text-[#6f7974]">
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            <span className="text-[10px]">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
