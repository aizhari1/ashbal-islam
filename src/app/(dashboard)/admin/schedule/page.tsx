import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recentAtt } = await supabase
    .from('attendance')
    .select('session_date, status, students(name, code), teachers(name)')
    .order('session_date', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#eefdf6]/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">الجدول والحضور</h1>
      </header>
      <main className="px-4 pb-24">
        <h2 className="text-[14px] font-bold mt-2 mb-2">آخر سجلات الحضور</h2>
        <div className="space-y-2">
          {(recentAtt ?? []).map((a: { session_date: string; status: string; students: { name: string } | null; teachers: { name: string } | null }, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-3.5 shadow-sm flex justify-between">
              <div>
                <p className="text-[14px] font-semibold">{a.students?.name}</p>
                <p className="text-[11px] text-[#6f7974]">{a.session_date} · {a.teachers?.name || '—'}</p>
              </div>
              <span className={`text-[12px] font-bold ${a.status === 'حاضر' ? 'text-[#176b52]' : 'text-[#ba1a1a]'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
