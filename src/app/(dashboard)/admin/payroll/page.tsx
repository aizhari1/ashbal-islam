import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PayrollPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, name, code, rate_percent, is_active')
    .eq('is_active', true)
    .order('name')

  const { data: att } = await supabase
    .from('attendance')
    .select('teacher_id, status')
    .gte('session_date', '2026-10-01')
    .lte('session_date', '2026-10-31')
    .eq('status', 'حاضر')

  const sessionsByTeacher: Record<string, number> = {}
  for (const a of att ?? []) {
    if (!a.teacher_id) continue
    sessionsByTeacher[a.teacher_id] = (sessionsByTeacher[a.teacher_id] || 0) + 1
  }

  const rows = (teachers ?? []).map((t) => {
    const sessions = sessionsByTeacher[t.id] || 0
    const rate = Number(t.rate_percent || 50) / 100
    const gross = sessions * 60
    const teacherShare = Math.round(gross * rate)
    return { ...t, sessions, gross, teacherShare }
  })

  const totalShare = rows.reduce((s, r) => s + r.teacherShare, 0)

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">رواتب المعلمين</h1>
          <p className="text-[11px] text-[#6f7974]">أكتوبر 2026 · حسب الحضور</p>
        </div>
      </header>
      <main className="px-4 pb-24">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <p className="text-[12px] text-[#6f7974]">إجمالي مستحقات المعلمين</p>
          <p className="text-[24px] font-bold text-[#176b52]">{totalShare.toLocaleString('ar-EG')} ج.م</p>
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold text-[14px]">{r.name}</p>
                  <p className="text-[11px] text-[#6f7974]">{r.code} · نسبة {r.rate_percent}%</p>
                </div>
                <p className="text-[16px] font-bold text-[#176b52]">{r.teacherShare.toLocaleString('ar-EG')}</p>
              </div>
              <div className="flex gap-4 mt-2 text-[12px] text-[#6f7974]">
                <span>حصص: <b className="text-[#111e1a]">{r.sessions}</b></span>
                <span>إجمالي: <b className="text-[#111e1a]">{r.gross}</b></span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
