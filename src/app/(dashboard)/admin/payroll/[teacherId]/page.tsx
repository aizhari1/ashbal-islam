import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const DEFAULT_RATE = 25

function monthBounds(key?: string) {
  if (!key || key === 'all') {
    return { start: '2020-01-01', end: '2099-12-31', label: 'كل الشهور', key: 'all' }
  }
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
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
  const { start, end, label, key } = monthBounds(sp.month || 'all')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id, code, name').eq('id', teacherId).maybeSingle()
  if (!teacher) notFound()

  const { data: rateLogs } = await supabase
    .from('activity_log')
    .select('details')
    .eq('action', 'teacher_session_rate')
    .eq('entity_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(1)

  const teacherDefault = Number((rateLogs?.[0]?.details as any)?.session_rate || 0) || DEFAULT_RATE

  const attendance: any[] = []
  let off = 0
  while (true) {
    const { data: chunk } = await supabase
      .from('attendance')
      .select(
        'id, student_id, session_date, status, session_num, rating, notes, students(name, code, session_duration, monthly_sessions, price_per_session)'
      )
      .eq('teacher_id', teacherId)
      .gte('session_date', start)
      .lte('session_date', end)
      .order('session_date', { ascending: false })
      .range(off, off + 999)
    if (!chunk?.length) break
    attendance.push(...chunk)
    if (chunk.length < 1000) break
    off += 1000
  }

  const present = attendance.filter((a) => a.status === 'حاضر')

  type Stu = {
    id: string
    name: string
    code: string
    duration: number
    packageSize: number
    price: number
    sessions: { id: string; date: string; num: number | null; rating: number | null }[]
  }
  const byStudent: Record<string, Stu> = {}

  for (const a of present) {
    const sid = a.student_id || 'unknown'
    const st = a.students as any
    const price = Number(st?.price_per_session || 0) > 0 ? Number(st.price_per_session) : teacherDefault
    if (!byStudent[sid]) {
      byStudent[sid] = {
        id: sid,
        name: st?.name || 'طالب',
        code: st?.code || '—',
        duration: Number(st?.session_duration || 30),
        packageSize: Number(st?.monthly_sessions || 0),
        price,
        sessions: [],
      }
    }
    byStudent[sid].sessions.push({
      id: a.id,
      date: String(a.session_date).slice(0, 10),
      num: a.session_num,
      rating: a.rating,
    })
  }

  const groups = Object.values(byStudent).sort((a, b) => b.sessions.length - a.sessions.length)
  const totalSessions = present.length
  const due = groups.reduce((s, g) => s + g.sessions.length * g.price, 0)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={`/admin/payroll?month=${key}`} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold truncate" style={{ color: '#00513c' }}>
            {teacher.name}
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {teacher.code} · {label} · {totalSessions} حصة
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
            مستحق
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

      <div className="px-4 space-y-3">
        {groups.length === 0 && (
          <div className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا حصص في {label}
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
                  {g.code} · سعر {g.price} ج · {g.duration}د
                </p>
              </div>
              <div className="text-left shrink-0">
                <p className="text-[15px] font-bold" style={{ color: '#176b52' }}>
                  {g.sessions.length} حصة
                </p>
                <p className="text-[11px]">{(g.sessions.length * g.price).toLocaleString('ar-EG')} ج</p>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: '#e8f5ef' }}>
              {g.sessions.map((s, i) => (
                <div key={s.id} className="px-3.5 py-2.5 flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-semibold">{s.date}</p>
                    <p className="text-[10px]" style={{ color: '#6f7974' }}>
                      {s.num != null ? `حصة ${s.num}` : `#${i + 1}`}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                    {g.price} ج
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
