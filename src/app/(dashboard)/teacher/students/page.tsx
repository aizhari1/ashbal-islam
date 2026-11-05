import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StudentLastReport from './StudentLastReport'

export const dynamic = 'force-dynamic'

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  let students: {
    id: string
    name: string
    code: string
    status: string
    amount_due: number
    phone: string | null
  }[] = []
  const lastByStudent: Record<string, { notes: string; session_date: string; session_num: number | null }> = {}

  if (teacher) {
    const { data } = await supabase
      .from('students')
      .select('id, name, code, status, amount_due, phone')
      .eq('teacher_id', teacher.id)
      .order('name')
    students = (data as any) ?? []

    // آخر تقرير لكل طالب (حضور مع ملاحظات)
    const ids = students.map((s) => s.id)
    if (ids.length) {
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, notes, session_date, session_num')
        .eq('teacher_id', teacher.id)
        .in('student_id', ids)
        .order('session_date', { ascending: false })
        .limit(400)
      for (const a of att ?? []) {
        if (!a.student_id || lastByStudent[a.student_id]) continue
        if (!(a.notes || '').trim()) continue
        lastByStudent[a.student_id] = {
          notes: a.notes || '',
          session_date: a.session_date,
          session_num: a.session_num,
        }
      }
    }
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
          <div key={s.id} className="bg-white rounded-2xl p-3.5 shadow-sm">
            <div className="flex justify-between">
              <div>
                <p className="font-bold text-[14px]">{s.name}</p>
                <p className="text-[11px] text-[#6f7974]">
                  {s.code} · {s.status}
                </p>
              </div>
              <div className="text-left">
                {s.amount_due > 0 && <span className="text-[12px] text-[#ba1a1a] font-bold block">{s.amount_due}</span>}
                <Link href={`/teacher/session`} className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                  تحضير
                </Link>
              </div>
            </div>
            <StudentLastReport
              phone={s.phone}
              last={lastByStudent[s.id] || null}
            />
          </div>
        ))}
        {students.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا طلاب مرتبطين بحسابك
          </p>
        )}
      </main>
    </div>
  )
}
