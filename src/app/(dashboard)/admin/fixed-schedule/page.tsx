import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FixedScheduleForm } from './FixedScheduleForm'
import ScheduleRow from './ScheduleRow'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

function parseZoom(notes: string | null) {
  if (!notes) return null
  const m = notes.match(/ZOOM=(\S+)/)
  return m ? m[1] : null
}

export default async function FixedSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entries } = await supabase
    .from('schedule_entries')
    .select('*, students(name, code), teachers(name)')
    .order('day_of_week')
    .order('start_time')
    .limit(1000)

  const { data: students } = await supabase
    .from('students')
    .select('id, name, code')
    .eq('status', 'نشط')
    .order('name')
    .limit(200)

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">المواعيد الثابتة</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>الجدول الأسبوعي + روابط الحلقات</p>
        </div>
      </header>

      <main className="px-4">
        <div className="card p-4 mb-4">
          <h2 className="text-[13px] font-bold mb-3">إضافة موعد</h2>
          <FixedScheduleForm students={students ?? []} teachers={teachers ?? []} />
        </div>

        <h2 className="text-[13px] font-bold mb-2">الجدول ({entries?.length ?? 0})</h2>
        <div className="space-y-2">
          {(entries ?? []).map((e: any) => (
            <ScheduleRow key={e.id} entry={e} teachers={teachers ?? []} />
          ))}
          {(!entries || entries.length === 0) && (
            <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا مواعيد ثابتة بعد</p>
          )}
        </div>
      </main>
    </div>
  )
}
