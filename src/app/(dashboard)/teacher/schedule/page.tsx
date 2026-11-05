import { formatTime12 } from '@/lib/time-format'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default async function TeacherSchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()

  let entries: any[] = []
  if (teacher) {
    const sb = serviceClient()
    const { data } = await sb
      .from('schedule_entries')
      .select('id, day_of_week, session_date, start_time, duration_minutes, status, notes, students(name, code)')
      .eq('teacher_id', teacher.id)
      .order('day_of_week')
      .order('start_time')
    entries = data ?? []
  }

  const byDay: Record<number, any[]> = {}
  for (const e of entries) {
    const d = e.day_of_week ?? 0
    ;(byDay[d] = byDay[d] || []).push(e)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>
        ← رجوع
      </Link>
      <h1 className="text-[18px] font-bold mt-2 mb-4">جدولي</h1>
      <div className="space-y-3">
        {Object.keys(byDay)
          .map(Number)
          .sort((a, b) => a - b)
          .map((day) => (
            <div key={day} className="card p-3">
              <p className="font-bold text-[14px] mb-2" style={{ color: '#00513c' }}>
                {DAYS[day] ?? day}
              </p>
              <div className="space-y-2">
                {byDay[day].map((e) => (
                  <div key={e.id} className="flex justify-between text-[13px] py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                    <span>{e.students?.name || '—'}</span>
                    <span className="font-bold" style={{ color: '#176b52' }} dir="ltr">
                      {formatTime12(e.start_time)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        {entries.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا مواعيد ثابتة
          </p>
        )}
      </div>
    </div>
  )
}
