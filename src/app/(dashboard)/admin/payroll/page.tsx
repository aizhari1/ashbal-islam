import { currentMonthKey } from '@/lib/dues'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PayrollActions } from './PayrollActions'

export const dynamic = 'force-dynamic'

const DEFAULT_SESSION_RATE = 25

function monthBounds(key?: string) {
  if (key === 'all') {
    return { start: '2020-01-01', end: '2099-12-31', label: 'كل الشهور', key: 'all' }
  }
  if (!key) key = currentMonthKey()
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  if (!y || !m) {
    return monthBounds(currentMonthKey())
  }
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key: `${y}-${String(m).padStart(2, '0')}` }
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  try {
    const sp = await searchParams
    const { start: monthStart, end: monthEnd, label, key } = monthBounds(sp.month || currentMonthKey())

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, code, name, rate_percent, is_active')
      .eq('is_active', true)
      .order('name')

    const attendance: any[] = []
    let off = 0
    while (true) {
      // نفس تعريف lib/teacher-payroll: حاضر + متأخر، وبترتيب ثابت عشان الصفحات متتكررش
      const { data: chunk, error: attErr } = await supabase
        .from('attendance')
        .select('id, teacher_id, student_id, status, session_date, students(price_per_session)')
        .gte('session_date', monthStart)
        .lte('session_date', monthEnd)
        .in('status', ['حاضر', 'متأخر'])
        .order('session_date', { ascending: true })
        .order('id', { ascending: true })
        .range(off, off + 999)
      if (attErr) throw new Error(attErr.message)
      if (!chunk?.length) break
      attendance.push(...chunk)
      if (chunk.length < 1000) break
      off += 1000
    }

    const { data: rateLogs } = await supabase
      .from('activity_log')
      .select('entity_id, details')
      .eq('action', 'teacher_session_rate')

    const teacherDefaultRate: Record<string, number> = {}
    for (const r of rateLogs ?? []) {
      const rate = Number((r.details as any)?.session_rate || 0)
      if (r.entity_id && rate > 0) teacherDefaultRate[r.entity_id] = rate
    }

    type Agg = { sessions: number; salary: number; rates: Record<number, number> }
    const byTeacher: Record<string, Agg> = {}

    for (const a of attendance) {
      if (!a.teacher_id) continue
      if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = { sessions: 0, salary: 0, rates: {} }
      const st = a.students as any
      let rate = Number(st?.price_per_session || 0)
      if (rate <= 0) rate = teacherDefaultRate[a.teacher_id] || DEFAULT_SESSION_RATE
      if (rate < DEFAULT_SESSION_RATE) rate = DEFAULT_SESSION_RATE
      byTeacher[a.teacher_id].sessions += 1
      byTeacher[a.teacher_id].salary += rate
      byTeacher[a.teacher_id].rates[rate] = (byTeacher[a.teacher_id].rates[rate] || 0) + 1
    }

    const { data: settlements } = await supabase.from('activity_log').select('details').eq('action', 'teacher_settlement')
    const settledByName: Record<string, number> = {}
    for (const s of settlements ?? []) {
      const d = s.details as any
      if (d?.teacher_name) {
        if (d?.month && key !== 'all' && d.month !== key) continue
        settledByName[d.teacher_name] = (settledByName[d.teacher_name] || 0) + Number(d.amount || 0)
      }
    }

    const rows = (teachers ?? [])
      .map((t) => {
        const agg = byTeacher[t.id] || { sessions: 0, salary: 0, rates: {} }
        const defaultRate = teacherDefaultRate[t.id] ?? DEFAULT_SESSION_RATE
        const settled = settledByName[t.name] || 0
        const remaining = Math.max(0, agg.salary - settled)
        const rateParts = Object.entries(agg.rates)
          .map(([rate, cnt]) => `${cnt}×${rate}`)
          .join(' + ')
        return {
          id: t.id,
          code: t.code,
          name: t.name,
          sessions: agg.sessions,
          sessionRate: defaultRate,
          rateParts: rateParts || `0×${defaultRate}`,
          multiRate: Object.keys(agg.rates).length > 1,
          academyRate: Number(t.rate_percent || 50),
          salary: agg.salary,
          settled,
          remaining,
        }
      })
      .sort((a, b) => b.salary - a.salary)

    const totalSalary = rows.reduce((s, r) => s + r.salary, 0)
    const totalSessions = rows.reduce((s, r) => s + r.sessions, 0)
    const totalSettled = rows.reduce((s, r) => s + r.settled, 0)

    const months: string[] = [currentMonthKey()]
    const base = new Date()
    for (let i = 1; i < 8; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    months.push('all')

    return (
      <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
        <header className="px-4 py-3 flex items-center gap-3">
          <a href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </a>
          <div>
            <h1 className="text-[16px] font-bold">الرواتب بعدد الحصص</h1>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              {label} · ادخل على المعلم للتسوية وPDF
            </p>
          </div>
        </header>

        <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
          {months.map((m) => (
            <a
              key={m}
              href={`/admin/payroll?month=${m}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
              style={{
                background: m === key ? '#176b52' : '#fff',
                color: m === key ? '#fff' : '#3f4944',
                border: '1px solid #cde8dc',
              }}
            >
              {m === 'all' ? 'الكل' : m}
            </a>
          ))}
        </div>

        <main className="px-4">
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  الحصص
                </p>
                <p className="text-[20px] font-bold" style={{ color: '#00513c' }}>
                  {totalSessions}
                </p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  إجمالي الرواتب
                </p>
                <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>
                  {totalSalary.toLocaleString('ar-EG')}
                </p>
              </div>
              <div>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  تم صرفه
                </p>
                <p className="text-[20px] font-bold">{totalSettled.toLocaleString('ar-EG')}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card p-4">
                <a href={`/admin/payroll/${r.id}?month=${key}`} className="block active:opacity-80">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[14px]" style={{ color: '#00513c' }}>
                        {r.name}
                        <span className="material-symbols-outlined text-[16px] align-middle mr-1" style={{ color: '#176b52' }}>
                          chevron_left
                        </span>
                      </p>
                      <p className="text-[11px]" style={{ color: '#6f7974' }}>
                        {r.code}
                        {r.multiRate ? ' · أسعار متعددة' : ''}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[16px] font-bold" style={{ color: '#176b52' }}>
                        {r.salary.toLocaleString('ar-EG')}
                      </p>
                      <p className="text-[10px]" style={{ color: '#6f7974' }}>
                        المتبقي {r.remaining.toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[12px] mb-2">
                    <div className="rounded-lg p-2 text-center" style={{ background: '#e8f7f0' }}>
                      <p style={{ color: '#6f7974' }}>حصص</p>
                      <p className="font-bold">{r.sessions}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center col-span-2" style={{ background: '#e8f7f0' }}>
                      <p style={{ color: '#6f7974' }}>تفاصيل السعر</p>
                      <p className="font-bold text-[11px]">{r.rateParts} ج</p>
                    </div>
                  </div>
                </a>

                <a
                  href={`/admin/payroll/${r.id}?month=${key}`}
                  className="block w-full text-center py-2.5 rounded-xl text-white font-bold text-[13px] mb-2"
                  style={{ background: '#25D366' }}
                >
                  واتساب · PDF · تفاصيل الحصص
                </a>

                <PayrollActions
                  teacherId={r.id}
                  teacherName={r.name}
                  sessionRate={r.sessionRate}
                  academyRate={r.academyRate}
                  remaining={r.remaining}
                />
              </div>
            ))}
            {rows.length === 0 && (
              <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
                مفيش معلمين نشطين
              </p>
            )}
          </div>
        </main>
      </div>
    )
  } catch (e: any) {
    return (
      <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
        <a href="/admin" className="text-[13px] font-bold" style={{ color: '#176b52' }}>
          ← رجوع
        </a>
        <p className="card p-4 mt-4 text-[13px]" style={{ color: '#93000a' }}>
          حصل خطأ في مسير الرواتب: {e?.message || 'غير معروف'}
        </p>
        <a href="/admin/payroll" className="block mt-3 text-center font-bold py-3 rounded-xl text-white" style={{ background: '#176b52' }}>
          إعادة المحاولة
        </a>
      </div>
    )
  }
}
