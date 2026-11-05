import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const zoomOf = (n: string | null) => (n ? (n.match(/ZOOM=(\S+)/) || [])[1] || null : null)
const plain = (n: string | null) => (n ? n.replace(/\s*\|?\s*ZOOM=\S+/, '').trim() : '')

export default async function TeacherSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  let entries: any[] = []
  if (teacher) {
    const { data } = await serviceClient()
      .from('schedule_entries')
      .select('id, day_of_week, session_date, start_time, duration_minutes, status, notes, students(name, code)')
      .eq('teacher_id', teacher.id)
      .order('day_of_week')
      .order('start_time')
      .limit(300)
    entries = data ?? []
  }
  const byDay = new Map<number, any[]>()
  for (const e of entries) {
    const d = typeof e.day_of_week === 'number' ? e.day_of_week : 9
    byDay.set(d, [...(byDay.get(d) || []), e])
  }
  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">جدولي</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>المواعيد بتتضاف من الإشراف أو الإدارة، وهنا للعرض (من الصبح للليل داخل كل يوم).</p>
      <div className="mt-4 space-y-4">
        {[...byDay.keys()].sort((a, b) => a - b).map((d) => (
          <div key={d}>
            <h2 className="text-[13px] font-bold mb-1.5" style={{ color: '#00513c' }}>{DAYS[d] || 'موعد بتاريخ'}</h2>
            <div className="space-y-2">
              {byDay.get(d)!.map((e) => {
                const zoom = zoomOf(e.notes)
                return (
                  <div key={e.id} className="card p-3 text-[13px]">
                    <div className="flex justify-between">
                      <p className="font-bold">{e.students?.name || '—'}</p>
                      <span className="font-bold" style={{ color: '#176b52' }} dir="ltr">{(e.start_time || '').slice(0, 5) || '—'}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: '#6f7974' }}>
                      {e.duration_minutes || 30} دقيقة{e.session_date ? ` · ${e.session_date}` : ''}{plain(e.notes) ? ` · ${plain(e.notes)}` : ''}
                    </p>
                    {zoom && <a href={zoom} target="_blank" rel="noreferrer" className="text-[12px] font-bold block mt-1" style={{ color: '#176b52' }} dir="ltr">رابط الحلقة ↗</a>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا مواعيد ثابتة بعد</p>}
      </div>
    </div>
  )
}
