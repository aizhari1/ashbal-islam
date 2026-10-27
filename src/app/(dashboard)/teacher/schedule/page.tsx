import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  let entries: { id: string; session_date: string | null; start_time: string | null; students: { name: string } | null }[] = []
  if (teacher) {
    const { data } = await supabase.from('schedule_entries').select('*, students(name, code)').eq('teacher_id', teacher.id).limit(40)
    entries = data ?? []
  }
  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto p-4">
      <Link href="/teacher" className="text-[#0d9b8a] text-[13px]">← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">جدولي</h1>
      <div className="mt-4 space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="bg-white rounded-2xl p-3 shadow-sm">
            <p className="font-bold text-[14px]">{e.students?.name || '—'}</p>
            <p className="text-[12px] text-[#6f7974]">{e.session_date || e.start_time || 'موعد ثابت'}</p>
          </div>
        ))}
        {entries.length === 0 && <p className="text-[13px] text-[#6f7974]">لا مواعيد ثابتة بعد</p>}
      </div>
    </div>
  )
}
