import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PayrollActions } from './PayrollActions'

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // أكتوبر فقط
  const monthStart = '2026-10-01'
  const monthEnd = '2026-10-31'

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, code, name, rate_percent, is_active')
    .eq('is_active', true)
    .order('name')

  const { data: attendance } = await supabase
    .from('attendance')
    .select('teacher_id, status, session_date')
    .gte('session_date', monthStart)
    .lte('session_date', monthEnd)
    .eq('status', 'حاضر')

  const sessionsByTeacher: Record<string, number> = {}
  for (const a of attendance ?? []) {
    if (!a.teacher_id) continue
    sessionsByTeacher[a.teacher_id] = (sessionsByTeacher[a.teacher_id] || 0) + 1
  }

  const { data: rateLogs } = await supabase
    .from('activity_log')
    .select('entity_id, details')
    .eq('action', 'teacher_session_rate')

  const sessionRateByTeacher: Record<string, number> = {}
  for (const r of rateLogs ?? []) {
    const rate = Number((r.details as any)?.session_rate || 0)
    if (r.entity_id && rate > 0) sessionRateByTeacher[r.entity_id] = rate
  }

  const { data: settlements } = await supabase
    .from('activity_log')
    .select('details')
    .eq('action', 'teacher_settlement')

  const settledByName: Record<string, number> = {}
  for (const s of settlements ?? []) {
    const d = s.details as any
    if (d?.teacher_name) settledByName[d.teacher_name] = (settledByName[d.teacher_name] || 0) + Number(d.amount || 0)
  }

  const DEFAULT_SESSION_RATE = 25

  const rows = (teachers ?? []).map((t) => {
    const sessions = sessionsByTeacher[t.id] || 0
    const sessionRate = sessionRateByTeacher[t.id] ?? DEFAULT_SESSION_RATE
    const salary = sessions * sessionRate
    const settled = settledByName[t.name] || 0
    const remaining = Math.max(0, salary - settled)
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      sessions,
      sessionRate,
      academyRate: Number(t.rate_percent || 50),
      salary,
      settled,
      remaining,
    }
  }).sort((a, b) => b.salary - a.salary)

  const totalSalary = rows.reduce((s, r) => s + r.salary, 0)
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)
  const totalSettled = rows.reduce((s, r) => s + r.settled, 0)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">الرواتب بعدد الحصص</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>أكتوبر 2026 فقط · راتب = حصص × 25 ج.م</p>
        </div>
      </header>

      <main className="px-4">
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>حصص أكتوبر</p>
              <p className="text-[20px] font-bold" style={{ color: '#00513c' }}>{totalSessions}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>إجمالي الرواتب</p>
              <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{totalSalary.toLocaleString('ar-EG')}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>تم صرفه</p>
              <p className="text-[20px] font-bold">{totalSettled.toLocaleString('ar-EG')}</p>
            </div>
          </div>
          <p className="text-[11px] mt-3 text-center" style={{ color: '#6f7974' }}>
            سعر الحصة للكل: {DEFAULT_SESSION_RATE} ج.م · من حضور أكتوبر فقط
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-[14px]">{r.name}</p>
                  <p className="text-[11px]" style={{ color: '#6f7974' }}>{r.code}</p>
                </div>
                <div className="text-left">
                  <p className="text-[16px] font-bold" style={{ color: '#176b52' }}>{r.salary.toLocaleString('ar-EG')}</p>
                  <p className="text-[10px]" style={{ color: '#6f7974' }}>المتبقي {r.remaining.toLocaleString('ar-EG')}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px] mb-3">
                <div className="rounded-lg p-2 text-center" style={{ background: '#e8f7f0' }}>
                  <p style={{ color: '#6f7974' }}>حصص</p>
                  <p className="font-bold">{r.sessions}</p>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: '#e8f7f0' }}>
                  <p style={{ color: '#6f7974' }}>سعر الحصة</p>
                  <p className="font-bold">{r.sessionRate}</p>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: '#e8f7f0' }}>
                  <p style={{ color: '#6f7974' }}>نسبة الأكاديمية</p>
                  <p className="font-bold">{r.academyRate}%</p>
                </div>
              </div>
              <PayrollActions
                teacherId={r.id}
                teacherName={r.name}
                sessionRate={r.sessionRate}
                academyRate={r.academyRate}
                remaining={r.remaining}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
