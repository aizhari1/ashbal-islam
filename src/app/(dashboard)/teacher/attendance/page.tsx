import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  let query = supabase.from('attendance').select('*, students(name, code)').order('session_date', { ascending: false }).limit(40)
  if (teacher) query = query.eq('teacher_id', teacher.id)
  const { data: rows } = await query

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">سجل الحضور</h1>
      </header>
      <main className="px-4 pb-24 space-y-2">
        {(rows ?? []).map((r: { id: string; session_date: string; status: string; hifz_from: string | null; hifz_to: string | null; muraja_from: string | null; muraja_to: string | null; students: { name: string; code: string } | null }) => (
          <div key={r.id} className="bg-white rounded-2xl p-3.5 shadow-sm">
            <div className="flex justify-between">
              <p className="font-bold text-[14px]">{r.students?.name}</p>
              <span className="text-[12px] font-semibold text-[#176b52]">{r.status}</span>
            </div>
            <p className="text-[11px] text-[#6f7974]">{r.session_date} · {r.students?.code}</p>
          </div>
        ))}
      </main>
    </div>
  )
}
