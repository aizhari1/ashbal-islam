import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
  return { start, end, label, key }
}

export default async function SessionsDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; teacher?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'supervisor') redirect('/login')

  const { start, end, label, key } = monthBounds(sp.month || 'all')

  const [{ data: teachers }, { data: students }] = await Promise.all([
    supabase.from('teachers').select('id, code, name, is_active').order('name'),
    supabase
      .from('students')
      .select('id, code, name, teacher_id, monthly_sessions, session_duration, price_per_session, status')
      .order('name')
      .limit(500),
  ])

  const attendance: any[] = []
  let off = 0
  while (true) {
    const { data: chunk } = await supabase
      .from('attendance')
      .select('id, student_id, teacher_id, session_date, status, session_num, rating, notes')
      .gte('session_date', start)
      .lte('session_date', end)
      .order('session_date', { ascending: false })
      .range(off, off + 999)
    if (!chunk?.length) break
    attendance.push(...chunk)
    if (chunk.length < 1000) break
    off += 1000
    if (off > 50000) break
  }

  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]))
  const studentMap = new Map((students ?? []).map((s) => [s.id, s]))
  const present = attendance.filter((a) => a.status === 'حاضر')
  const filterTeacher = sp.teacher || 'all'

  type Group = {
    teacherId: string
    teacherName: string
    teacherCode: string
    sessions: number
    students: {
      id: string
      name: string
      code: string
      count: number
      price: number
      duration: number
      packageSize: number
      dates: string[]
    }[]
  }

  const byTeacher: Record<string, Group> = {}

  for (const a of present) {
    const tid = a.teacher_id || 'unknown'
    if (filterTeacher !== 'all' && tid !== filterTeacher) continue
    const t = teacherMap.get(tid)
    if (!byTeacher[tid]) {
      byTeacher[tid] = {
        teacherId: tid,
        teacherName: t?.name || 'بدون معلم',
        teacherCode: t?.code || '—',
        sessions: 0,
        students: [],
      }
    }
    byTeacher[tid].sessions += 1
    const st = studentMap.get(a.student_id)
    let g = byTeacher[tid].students.find((s) => s.id === a.student_id)
    if (!g) {
      g = {
        id: a.student_id || 'x',
        name: st?.name || 'طالب',
        code: st?.code || '—',
        count: 0,
        price: Number(st?.price_per_session || DEFAULT_RATE),
        duration: Number(st?.session_duration || 30),
        packageSize: Number(st?.monthly_sessions || 0),
        dates: [],
      }
      byTeacher[tid].students.push(g)
    }
    g.count += 1
    g.dates.push(String(a.session_date).slice(0, 10))
  }

  const groups = Object.values(byTeacher).sort((a, b) => b.sessions - a.sessions)
  for (const g of groups) g.students.sort((a, b) => b.count - a.count)

  const presentCount = present.filter((a) => filterTeacher === 'all' || a.teacher_id === filterTeacher).length
  const allCount = attendance.length
  const otherCount = allCount - present.length

  const months = ['all']
  const base = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تفاصيل الحصص
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {label} · {presentCount} حضور من أصل {allCount}
          </p>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/admin/sessions-detail?month=${m}${filterTeacher !== 'all' ? `&teacher=${filterTeacher}` : ''}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: m === key ? '#176b52' : '#fff',
              color: m === key ? '#fff' : '#3f4944',
              border: '1px solid #cde8dc',
            }}
          >
            {m === 'all' ? 'الكل' : m}
          </Link>
        ))}
      </div>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={`/admin/sessions-detail?month=${key}`}
          className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{
            background: filterTeacher === 'all' ? '#00513c' : '#fff',
            color: filterTeacher === 'all' ? '#fff' : '#3f4944',
            border: '1px solid #cde8dc',
          }}
        >
          كل المعلمين
        </Link>
        {(teachers ?? [])
          .filter((t) => t.is_active !== false)
          .map((t) => (
            <Link
              key={t.id}
              href={`/admin/sessions-detail?month=${key}&teacher=${t.id}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{
                background: filterTeacher === t.id ? '#00513c' : '#fff',
                color: filterTeacher === t.id ? '#fff' : '#3f4944',
                border: '1px solid #cde8dc',
              }}
            >
              {t.name}
            </Link>
          ))}
      </div>

      <section className="px-4 mb-3 grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#00513c' }}>
            {presentCount}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            حضور
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#6f7974' }}>
            {otherCount}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            غير حاضر
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>
            {groups.length}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            معلمون
          </p>
        </div>
      </section>

      <div className="px-4 space-y-3">
        {groups.length === 0 && (
          <div className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا حصص حضور في هذه الفترة
          </div>
        )}
        {groups.map((g) => (
          <div key={g.teacherId} className="card overflow-hidden">
            <Link
              href={`/admin/payroll/${g.teacherId}?month=${key}`}
              className="block p-3.5 flex justify-between"
              style={{ background: '#f0faf5' }}
            >
              <div>
                <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>
                  {g.teacherName}
                </p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {g.teacherCode} · {g.students.length} طالب
                </p>
              </div>
              <div className="text-left">
                <p className="text-[16px] font-bold" style={{ color: '#176b52' }}>
                  {g.sessions} حصة
                </p>
              </div>
            </Link>
            <div className="divide-y" style={{ borderColor: '#e8f5ef' }}>
              {g.students.map((s) => (
                <div key={s.id} className="px-3.5 py-2.5">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{s.name}</p>
                      <p className="text-[10px]" style={{ color: '#6f7974' }}>
                        {s.code} · باقة {s.packageSize || '—'} · {s.duration}د · {s.price}ج
                      </p>
                    </div>
                    <p className="text-[13px] font-bold" style={{ color: '#176b52' }}>
                      {s.count} حصة
                    </p>
                  </div>
                  <p className="text-[10px] mt-1 leading-relaxed" style={{ color: '#6f7974' }}>
                    {s.dates.slice(0, 12).join(' · ')}
                    {s.dates.length > 12 ? ` · +${s.dates.length - 12}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
