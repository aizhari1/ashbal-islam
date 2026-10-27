import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FixedScheduleForm } from './FixedScheduleForm'

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
    .limit(100)

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
          {(entries ?? []).map((e: any) => {
            const zoom = parseZoom(e.notes)
            return (
              <div key={e.id} className="card p-3.5 text-[13px]">
                <div className="flex justify-between">
                  <p className="font-bold">{DAYS[e.day_of_week] || e.day_of_week} · {e.start_time || '—'}</p>
                  <span className="badge-ok">{e.status}</span>
                </div>
                <p className="mt-1">{e.students?.name || 'بدون طالب'} · {e.teachers?.name || 'بدون معلم'}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>{e.duration_minutes || 30} دقيقة</p>
                {zoom && (
                  <a href={zoom} target="_blank" rel="noreferrer" className="text-[12px] font-semibold block mt-1" style={{ color: '#176b52' }} dir="ltr">
                    رابط الحلقة ↗
                  </a>
                )}
              </div>
            )
          })}
          {(!entries || entries.length === 0) && (
            <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا مواعيد ثابتة بعد</p>
          )}
        </div>
      </main>
    </div>
  )
}
