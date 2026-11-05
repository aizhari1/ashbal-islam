import Link from 'next/link'
import { redirect } from 'next/navigation'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'
import DeleteBtn from './DeleteBtn'

export const dynamic = 'force-dynamic'

export default async function AttendedPage() {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const { data } = await serviceClient()
    .from('attendance')
    .select('id, session_date, status, session_num, session_duration, students(name, code), teachers(name)')
    .in('status', ['حاضر', 'متأخر'])
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(150)
  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-12">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/more" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <div><h1 className="text-[16px] font-bold">الحصص اللي حضروها</h1><p className="text-[11px]" style={{ color: '#6f7974' }}>أي حصة اتعلّمت حضور تظهر هنا. تقدر تحذف الحصة فقط — نص تقريرها بيتحفظ في سجل الأنشطة.</p></div>
      </header>
      <main className="px-4 space-y-2">
        {(data || []).map((r: any) => (
          <div key={r.id} className="card p-3 text-[13px] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold truncate">{r.students?.name || '—'} <span className="text-[11px]" style={{ color: '#6f7974' }}>{r.students?.code}</span></p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{r.session_date}{r.session_num ? ` · حصة ${r.session_num}` : ''} · {r.teachers?.name || 'بدون معلم'}{r.session_duration ? ` · ${r.session_duration} د` : ''}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0"><span className={r.status === 'حاضر' ? 'badge-ok' : 'badge-warn'}>{r.status}</span><DeleteBtn id={r.id} /></div>
          </div>
        ))}
        {(!data || data.length === 0) && <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا حصص</p>}
      </main>
    </div>
  )
}
