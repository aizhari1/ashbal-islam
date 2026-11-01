import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const DEFAULT_RATE = 25

function monthBounds(key?: string) {
  const now = new Date()
  const y = key?.slice(0, 4) ? Number(key.slice(0, 4)) : now.getFullYear()
  const m = key?.slice(5, 7) ? Number(key.slice(5, 7)) : now.getMonth() + 1
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key: `${y}-${String(m).padStart(2, '0')}` }
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
  if (profile?.role !== 'admin') redirect('/login')

  const { start, end, label, key } = monthBounds(sp.month)

  const [{ data: teachers }, { data: students }, { data: attendance }] = await Promise.all([
    supabase.from('teachers').select('id, code, name, is_active').order('name'),
    supabase
      .from('students')
      .select('id, code, name, teacher_id, monthly_sessions, session_duration, price_per_session, status')
      .order('name'),
    supabase
      .from('attendance')
      .select('id, student_id, teacher_id, session_date, status, session_num, rating, notes')
      .gte('session_date', start)
      .lte('session_date', end)
      .order('session_date', { ascending: false }),
  ])

  const teacherMap = new Map((teachers ?? []).map((t) => [t.id, t]))
  const studentMap = new Map((students ?? []).map((s) => [s.id, s]))

  // حاضر فقط للحساب
  const present = (attendance ?? []).filter((a) => a.status === 'حاضر')

  type StudentBucket = {
    studentId: string
    code: string
    name: string
    packageSize: number
    duration: number
    price: number
    sessions: number
    dates: string[]
  }

  type TeacherBucket = {
    teacherId: string
    code: string
    name: string
    totalSessions: number
    rate: number
    due: number
    students: StudentBucket[]
  }

  const byTeacher: Record<string, TeacherBucket> = {}

  for (const a of present) {
    const tid = a.teacher_id
    if (!tid) continue
    const t = teacherMap.get(tid)
    if (!byTeacher[tid]) {
      byTeacher[tid] = {
        teacherId: tid,
        code: t?.code || '—',
        name: t?.name || 'معلم',
        totalSessions: 0,
        rate: DEFAULT_RATE,
        due: 0,
        students: [],
      }
    }
    byTeacher[tid].totalSessions += 1

    const sid = a.student_id || 'unknown'
    let bucket = byTeacher[tid].students.find((s) => s.studentId === sid)
    if (!bucket) {
      const st = studentMap.get(sid)
      bucket = {
        studentId: sid,
        code: st?.code || '—',
        name: st?.name || 'طالب',
        packageSize: Number(st?.monthly_sessions || 0),
        duration: Number(st?.session_duration || 30),
        price: Number(st?.price_per_session || DEFAULT_RATE),
        sessions: 0,
        dates: [],
      }
      byTeacher[tid].students.push(bucket)
    }
    bucket.sessions += 1
    if (a.session_date) bucket.dates.push(a.session_date)
  }

  // طلاب مسجلين عند المعلم بدون حضور هذا الشهر (للمقارنة)
  for (const st of students ?? []) {
    if (!st.teacher_id || !byTeacher[st.teacher_id]) continue
    const exists = byTeacher[st.teacher_id].students.find((s) => s.studentId === st.id)
    if (!exists && (st.status === 'نشط' || st.status === 'نشيط')) {
      byTeacher[st.teacher_id].students.push({
        studentId: st.id,
        code: st.code || '—',
        name: st.name || 'طالب',
        packageSize: Number(st.monthly_sessions || 0),
        duration: Number(st.session_duration || 30),
        price: Number(st.price_per_session || DEFAULT_RATE),
        sessions: 0,
        dates: [],
      })
    }
  }

  for (const b of Object.values(byTeacher)) {
    b.due = b.totalSessions * b.rate
    b.students.sort((a, c) => c.sessions - a.sessions)
  }

  let rows = Object.values(byTeacher).sort((a, b) => b.totalSessions - a.totalSessions)
  if (sp.teacher) {
    rows = rows.filter((r) => r.teacherId === sp.teacher)
  }

  const grandSessions = rows.reduce((s, r) => s + r.totalSessions, 0)
  const grandDue = rows.reduce((s, r) => s + r.due, 0)
  const allCount = (attendance ?? []).length
  const presentCount = present.length
  const otherCount = allCount - presentCount

  // أشهر للتنقل
  const months: string[] = []
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
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تفاصيل الحصص
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            لكل معلم · مجموعات الطلاب · السعر والمدة
          </p>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/admin/sessions-detail?month=${m}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: m === key ? '#176b52' : '#fff',
              color: m === key ? '#fff' : '#3f4944',
              border: '1px solid #cde8dc',
            }}
          >
            {m}
          </Link>
        ))}
      </div>

      <p className="text-center text-[14px] font-bold mb-3" style={{ color: '#00513c' }}>
        {label}
      </p>

      <section className="px-4 mb-4 grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#00513c' }}>
            {grandSessions}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            حضور
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>
            {grandDue.toLocaleString('ar-EG')}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            مستحق (×{DEFAULT_RATE})
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[18px] font-bold" style={{ color: otherCount ? '#b45309' : '#6f7974' }}>
            {otherCount}
          </p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>
            غير حاضر
          </p>
        </div>
      </section>

      <p className="px-4 text-[11px] mb-2" style={{ color: '#6f7974' }}>
        الإجمالي المسجّل في الجدول: {allCount} · حاضر: {presentCount} · غير ذلك: {otherCount}
        <br />
        الحساب = عدد الحضور × {DEFAULT_RATE} ج للجلسة
      </p>

      <div className="px-4 space-y-3">
        {rows.length === 0 && (
          <div className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا توجد حصص حضور في هذا الشهر
          </div>
        )}

        {rows.map((t) => (
          <div key={t.teacherId} className="card overflow-hidden">
            <div className="p-3.5 flex items-start justify-between gap-2" style={{ background: '#f0faf5' }}>
              <div>
                <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>
                  {t.name}
                </p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  كود: {t.code} · طلاب بحضور: {t.students.filter((s) => s.sessions > 0).length}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[16px] font-bold" style={{ color: '#176b52' }}>
                  {t.totalSessions} حصة
                </p>
                <p className="text-[12px] font-semibold" style={{ color: '#00513c' }}>
                  {t.due.toLocaleString('ar-EG')} ج
                </p>
              </div>
            </div>

            <div className="divide-y" style={{ borderColor: '#e8f5ef' }}>
              {t.students.map((s) => {
                const expected = s.packageSize
                const gap = expected > 0 ? s.sessions - expected : 0
                return (
                  <div key={s.studentId} className="p-3">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-semibold" style={{ color: '#1a1c1b' }}>
                          {s.name}
                        </p>
                        <p className="text-[11px]" style={{ color: '#6f7974' }}>
                          {s.code} · باقة {s.packageSize || '—'} · مدة {s.duration} د · سعر{' '}
                          {s.price} ج
                        </p>
                      </div>
                      <div className="text-left shrink-0">
                        <p
                          className="text-[14px] font-bold"
                          style={{ color: s.sessions === 0 ? '#9ca3af' : '#176b52' }}
                        >
                          {s.sessions} حصة
                        </p>
                        {expected > 0 && (
                          <p
                            className="text-[10px] font-semibold"
                            style={{
                              color: gap === 0 ? '#6f7974' : gap < 0 ? '#b45309' : '#176b52',
                            }}
                          >
                            {gap === 0 ? 'مطابق للباقة' : gap < 0 ? `ناقص ${-gap}` : `زيادة ${gap}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {s.dates.length > 0 && (
                      <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: '#6f7974' }}>
                        التواريخ: {s.dates.slice(0, 12).join(' · ')}
                        {s.dates.length > 12 ? ` · +${s.dates.length - 12}` : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Link
          href="/admin/payroll"
          className="block text-center py-3 rounded-2xl text-[13px] font-bold text-white"
          style={{ background: '#176b52' }}
        >
          مستحقات المعلمين
        </Link>
      </div>
    </div>
  )
}
