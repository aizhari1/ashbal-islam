import { formatTime12 } from '@/lib/time-format'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()

  let entries: any[] = []
  if (teacher) {
    const { data } = await serviceClient()
      .from('schedule_entries')
      .select(
        'id, day_of_week, session_date, start_time, duration_minutes, status, notes, students(name, code, phone)'
      )
      .eq('teacher_id', teacher.id)
      .order('day_of_week')
      .order('start_time')
      .limit(500)
    entries = data ?? []
  }

  // اليوم (توقيت القاهرة تقريبًا UTC+2)
  const now = new Date()
  const cairoOffset = 2 * 60
  const local = new Date(now.getTime() + (cairoOffset - now.getTimezoneOffset()) * 60000)
  const todayDow = local.getDay()
  const todayStr = local.toISOString().slice(0, 10)

  // مواعيد اليوم: أسبوعي بنفس اليوم أو بتاريخ اليوم
  const todaySessions = entries.filter((e) => {
    if (e.session_date && String(e.session_date).slice(0, 10) === todayStr) return true
    if (e.day_of_week != null && Number(e.day_of_week) === todayDow) {
      // لو فيه تاريخ في المستقبل/الماضي ليوم تاني نتجاهل؟ نعرض الأسبوعي دائمًا
      if (!e.session_date) return true
      // بتاريخ في نوفمبر أو بدون تقييد شهر — لو نفس يوم الأسبوع
      return Number(e.day_of_week) === todayDow
    }
    return false
  })

  // تجميع أسبوعي (قوالب + أي يوم)
  const byDay = new Map<number, any[]>()
  for (const e of entries) {
    let d: number | null = e.day_of_week != null ? Number(e.day_of_week) : null
    if (d == null && e.session_date) {
      d = new Date(String(e.session_date).slice(0, 10) + 'T12:00:00').getDay()
    }
    if (d == null || d < 0 || d > 6) d = 9
    byDay.set(d, [...(byDay.get(d) || []), e])
  }

  function SessionCard({ e }: { e: any }) {
    const zoom = zoomOf(e.notes)
    const student = e.students?.name || '—'
    const code = e.students?.code || ''
    return (
      <div className="card p-3.5 text-[13px]">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="font-bold text-[14px]" style={{ color: '#00513c' }}>
              {student}
            </p>
            {code && (
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {code}
              </p>
            )}
          </div>
          <span className="font-bold text-[15px]" style={{ color: '#176b52' }} dir="ltr">
            {formatTime12(e.start_time)}
          </span>
        </div>
        <div className="mt-2 text-[12px] space-y-0.5" style={{ color: '#3f4944' }}>
          <p>
            <b>المدة:</b> {e.duration_minutes || 30} دقيقة
          </p>
          {e.session_date && (
            <p>
              <b>التاريخ:</b> {String(e.session_date).slice(0, 10)}
            </p>
          )}
          {e.status && (
            <p>
              <b>الحالة:</b> {e.status}
            </p>
          )}
          {plain(e.notes) && (
            <p>
              <b>تفاصيل:</b> {plain(e.notes)}
            </p>
          )}
        </div>
        {zoom && (
          <a
            href={zoom}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-bold block mt-2"
            style={{ color: '#176b52' }}
            dir="ltr"
          >
            رابط الحلقة ↗
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>
        ← رجوع
      </Link>
      <h1 className="text-[18px] font-bold mt-2">جدولي</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>
        حصصك حسب اليوم مع اسم الطالب وتفاصيل الحصة
      </p>

      {/* حصص اليوم */}
      <section className="mt-4">
        <h2 className="text-[14px] font-bold mb-2" style={{ color: '#00513c' }}>
          اليوم — {DAYS[todayDow]} {todayStr}
        </h2>
        {todaySessions.length === 0 ? (
          <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            مفيش حصص مجدولة النهاردة
          </p>
        ) : (
          <div className="space-y-2">
            {todaySessions
              .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')))
              .map((e) => (
                <SessionCard key={e.id + '-today'} e={e} />
              ))}
          </div>
        )}
      </section>

      {/* الجدول الأسبوعي */}
      <section className="mt-6">
        <h2 className="text-[14px] font-bold mb-2" style={{ color: '#00513c' }}>
          الجدول الأسبوعي
        </h2>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const list = byDay.get(d) || []
            if (!list.length) return null
            return (
              <div key={d}>
                <h3
                  className="text-[13px] font-bold mb-1.5 px-1"
                  style={{ color: d === todayDow ? '#176b52' : '#3f4944' }}
                >
                  {DAYS[d]}
                  {d === todayDow ? ' · اليوم' : ''}
                  <span className="font-normal text-[11px]" style={{ color: '#6f7974' }}>
                    {' '}
                    ({list.length} حصة)
                  </span>
                </h3>
                <div className="space-y-2">
                  {list
                    .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')))
                    .map((e) => (
                      <SessionCard key={e.id} e={e} />
                    ))}
                </div>
              </div>
            )
          })}
          {entries.length === 0 && (
            <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
              لا مواعيد ثابتة بعد — اطلب من الإشراف إضافة جدولك
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
