import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AttendanceArchivePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const monthStart = '2026-10-01'
  const monthEnd = '2026-10-31'

  const { data: rows } = await supabase
    .from('attendance')
    .select('id, session_date, status, notes, students(name, code), teachers(name)')
    .gte('session_date', monthStart)
    .lte('session_date', monthEnd)
    .order('session_date', { ascending: false })
    .limit(100)

  const present = (rows ?? []).filter((r: any) => r.status === 'حاضر').length
  const absent = (rows ?? []).filter((r: any) => r.status === 'غائب').length

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">الحضور والتحضير</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>أرشيف أكتوبر · {rows?.length ?? 0} سجل</p>
        </div>
      </header>

      <main className="px-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold">{rows?.length ?? 0}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>إجمالي</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{present}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>حاضر</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{absent}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>غائب</p>
          </div>
        </div>

        <Link href="/teacher/session" className="btn-primary block text-center py-3 mb-4 text-[14px]">
          + تسجيل حضور جديد (غرفة التسميع)
        </Link>

        <div className="space-y-2">
          {(rows ?? []).map((r: any) => (
            <div key={r.id} className="card p-3 flex justify-between items-center text-[13px]">
              <div className="min-w-0">
                <p className="font-bold truncate">{r.students?.name || '—'}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {r.session_date} · {r.teachers?.name || '—'}
                </p>
              </div>
              <span className={r.status === 'حاضر' ? 'badge-ok' : r.status === 'غائب' ? 'badge-err' : 'badge-warn'}>
                {r.status}
              </span>
            </div>
          ))}
          {(!rows || rows.length === 0) && (
            <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا سجلات حضور في أكتوبر</p>
          )}
        </div>
      </main>
    </div>
  )
}
