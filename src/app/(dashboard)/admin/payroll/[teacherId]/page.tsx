import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const DEFAULT_RATE = 25

function monthBounds(key?: string) {
  const y = key?.slice(0, 4) ? Number(key.slice(0, 4)) : 2026
  const m = key?.slice(5, 7) ? Number(key.slice(5, 7)) : 10
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key: `${y}-${String(m).padStart(2, '0')}` }
}

export default async function TeacherPayrollDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ teacherId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { teacherId } = await params
  const sp = await searchParams
  const { start, end, label, key } = monthBounds(sp.month || '2026-10')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, code, name')
    .eq('id', teacherId)
    .maybeSingle()

  if (!teacher) notFound()

  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, student_id, session_date, status, session_num, rating, notes, students(name, code, session_duration, monthly_sessions, price_per_session)')
    .eq('teacher_id', teacherId)
    .gte('session_date', start)
    .lte('session_date', end)
    .order('session_date', { ascending: false })

  const present = (attendance ?? []).filter((a) => a.status === 'حاضر')
  const other = (attendance ?? []).filter((a) => a.status !== 'حاضر')

  // تجميع حسب الطالب
  type Stu = {
    id: string
    name: string
    code: string
    duration: number
    packageSize: number
    price: number
    sessions: { id: string; date: string; num: number | null; rating: number | null; notes: string | null }[]
  }
  const byStudent: Record<string, Stu> = {}
  for (const a of present) {
    const sid = a.student_id || 'unknown'
    const st = a.students as any
    if (!byStudent[sid]) {
      byStudent[sid] = {
        id: sid,
        name: st?.name || 'طالب',
        code: st?.code || '—',
        duration: Number(st?.session_duration || 30),
        packageSize: Number(st?.monthly_sessions || 0),
        price: Number(st?.price_per_session || DEFAULT_RATE),
        sessions: [],
      }
    }
    byStudent[sid].sessions.push({
      id: a.id,
      date: String(a.session_date).slice(0, 10),
      num: a.session_num,
      rating: a.rating,
      notes: a.notes,
    })
  }

  const groups = Object.values(byStudent).sort((a, b) => b.sessions.length - a.sessions.length)
  const totalSessions = present.length
  const due = totalSessions * DEFAULT_RATE

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link
          href={`/admin/payroll?month=${key}`}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold truncate" style={{ color: '#00513c' }}>
            {teacher.name}
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {teacher.code} · {label} · تفاصيل الحصص
          </p>
        </div>
      </header>

      <section className="px-4 mb-4 grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#00513c' }}>
            {totalSessions}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            حضور
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>
            {due.toLocaleString('ar-EG')}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            مستحق (×{DEFAULT_RATE})
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#6f7974' }}>
            {groups.length}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            طلاب
          </p>
        </div>
      </section>

      {other.length > 0 && (
        <p className="px-4 text-[11px] mb-2" style={{ color: '#b45309' }}>
          سجلات غير حضور في الشهر: {other.length} (لا تدخل في الراتب)
        </p>
      )}

      <div className="px-4 space-y-3">
        {groups.length === 0 && (
          <div className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا حصص حضور لهذا المعلم في {label}
          </div>
        )}

        {groups.map((g) => (
          <div key={g.id} className="card overflow-hidden">
            <div className="p-3.5 flex justify-between gap-2" style={{ background: '#f0faf5' }}>
              <div>
                <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>
                  {g.name}
                </p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {g.code} · باقة {g.packageSize || '—'} · مدة {g.duration} د · سعر {g.price} ج
                </p>
              </div>
              <div className="text-left shrink-0">
                <p className="text-[15px] font-bold" style={{ color: '#176b52' }}>
                  {g.sessions.length} حصة
                </p>
                <p className="text-[11px]" style={{ color: '#00513c' }}>
                  {(g.sessions.length * DEFAULT_RATE).toLocaleString('ar-EG')} ج
                </p>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: '#e8f5ef' }}>
              {g.sessions.map((s, i) => (
                <div key={s.id} className="px-3.5 py-2.5 flex justify-between items-center gap-2">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: '#1a1c1b' }}>
                      {s.date}
                    </p>
                    <p className="text-[10px]" style={{ color: '#6f7974' }}>
                      {s.num != null ? `حصة رقم ${s.num}` : `#${i + 1}`}
                      {s.rating != null ? ` · تقييم ${s.rating}` : ''}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                    {DEFAULT_RATE} ج
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Link
          href={`/admin/payroll?month=${key}`}
          className="block text-center py-3 rounded-2xl text-[13px] font-bold"
          style={{ background: '#fff', border: '1px solid #cde8dc', color: '#176b52' }}
        >
          رجوع لمسير الرواتب
        </Link>
      </div>
    </div>
  )
}
