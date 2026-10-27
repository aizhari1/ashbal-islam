import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherAttendancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()

  let rows: any[] = []
  if (teacher) {
    const { data } = await supabase
      .from('attendance')
      .select('id, session_date, status, notes, students(name, code)')
      .eq('teacher_id', teacher.id)
      .gte('session_date', '2026-10-01')
      .lte('session_date', '2026-10-31')
      .order('session_date', { ascending: false })
      .limit(50)
    rows = data ?? []
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <div className="flex justify-between items-center mt-2 mb-4">
        <h1 className="text-[18px] font-bold">سجل حصصي — أكتوبر</h1>
        <Link href="/teacher/session" className="btn-primary text-[12px] px-3 py-2">تحضير</Link>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card p-3 flex justify-between text-[13px]">
            <div>
              <p className="font-bold">{r.students?.name}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{r.session_date}</p>
            </div>
            <span className={r.status === 'حاضر' ? 'badge-ok' : 'badge-err'}>{r.status}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا حصص مسجّلة</p>}
      </div>
    </div>
  )
}
