import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { todayKey } from '@/lib/dues'

export const dynamic = 'force-dynamic'
const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const zoomOf = (n: string | null) => (n ? (n.match(/ZOOM=(\S+)/) || [])[1] || null : null)

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role || ''
  if (!['admin', 'supervisor'].includes(role)) redirect('/login')

  const today = todayKey()
  const [y, m, d] = today.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()

  let sb: any
  try {
    sb = serviceClient()
  } catch {
    sb = supabase
  }

  const [{ data: entries }, { data: done }] = await Promise.all([
    sb
      .from('schedule_entries')
      .select('id, start_time, duration_minutes, notes, student_id, students(name, code), teachers(name)')
      .eq('day_of_week', dow)
      .order('start_time')
      .limit(500),
    sb.from('attendance').select('student_id, status').eq('session_date', today),
  ])
  const status = new Map((done || []).map((a: any) => [a.student_id, a.status]))
  const finished = (entries || []).filter((e: any) => status.has(e.student_id)).length
  const back = role === 'supervisor' ? '/supervisor' : '/admin'

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-12">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={back} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">مواعيد حلقات اليوم</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {DAYS[dow]} {today} · مرتبة بالوقت
          </p>
        </div>
      </header>
      <main className="px-4 space-y-2">
        <p className="text-[12px]" style={{ color: '#6f7974' }}>
          {entries?.length || 0} حصة مجدولة · {finished} اتسجّل لها حضور/غياب
        </p>
        {(entries || []).map((e: any) => {
          const st = status.get(e.student_id)
          const zoom = zoomOf(e.notes)
          return (
            <div key={e.id} className="card p-3 text-[13px]">
              <div className="flex justify-between">
                <p className="font-bold">{e.students?.name || '—'}</p>
                <span className="font-bold" style={{ color: '#176b52' }} dir="ltr">
                  {(e.start_time || '').slice(0, 5) || '—'}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {e.teachers?.name || 'بدون معلم'} · {e.duration_minutes || 30} دقيقة
                {e.students?.code ? ` · ${e.students.code}` : ''}
              </p>
              <div className="flex items-center justify-between mt-1">
                {st ? (
                  <span className={st === 'حاضر' || st === 'متأخر' ? 'badge-ok' : 'badge-err'}>{st}</span>
                ) : (
                  <span className="badge-warn">لم تُسجَّل</span>
                )}
                {zoom && (
                  <a href={zoom} target="_blank" rel="noreferrer" className="text-[12px] font-semibold" style={{ color: '#176b52' }}>
                    رابط الحلقة ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
        {(!entries || entries.length === 0) && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا حصص مجدولة النهاردة
          </p>
        )}
        <Link href="/admin/fixed-schedule" className="btn-primary block text-center py-2.5 mt-2 text-[13px]">
          تعديل المواعيد الثابتة
        </Link>
        <Link href="/admin/teacher-absences" className="block text-center py-2 text-[13px] font-bold" style={{ color: '#b45309' }}>
          تسجيل غياب معلم
        </Link>
      </main>
    </div>
  )
}
