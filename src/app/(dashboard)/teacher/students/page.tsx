import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  let students: { id: string; name: string; code: string; status: string; amount_due: number }[] = []
  if (teacher) {
    const { data } = await supabase.from('students').select('id, name, code, status, amount_due').eq('teacher_id', teacher.id).order('name')
    students = data ?? []
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">طلابي ({students.length})</h1>
      </header>
      <main className="px-4 pb-24 space-y-2">
        {students.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl p-3.5 shadow-sm flex justify-between">
            <div>
              <p className="font-bold text-[14px]">{s.name}</p>
              <p className="text-[11px] text-[#6f7974]">{s.code} · {s.status}</p>
            </div>
            {s.amount_due > 0 && <span className="text-[12px] text-[#ba1a1a] font-bold">{s.amount_due}</span>}
          </div>
        ))}
      </main>
    </div>
  )
}
