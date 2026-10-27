import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const monthStart = '2026-10-01'
  const monthEnd = '2026-10-31'

  const [
    { count: active },
    { count: paused },
    { count: withdrawn },
    { count: trial },
    { count: teachers },
    { data: payments },
    { data: dues },
    { data: attendance },
    { data: parentEvals },
  ] = await Promise.all([
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'موقوف'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'منسحب'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'تجريبي'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('payments').select('amount, payment_date').gte('payment_date', monthStart).lte('payment_date', monthEnd),
    supabase.from('students').select('id, name, code, amount_due').gt('amount_due', 0).order('amount_due', { ascending: false }).limit(20),
    supabase.from('attendance').select('id, status').gte('session_date', monthStart).lte('session_date', monthEnd),
    supabase.from('activity_log').select('id').eq('action', 'parent_evaluation'),
  ])

  const collected = (payments ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0)
  const present = (attendance ?? []).filter((a: any) => a.status === 'حاضر').length
  const absent = (attendance ?? []).filter((a: any) => a.status === 'غائب').length
  const totalAtt = attendance?.length ?? 0

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">التقارير والإحصائيات</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>أكتوبر 2026</p>
        </div>
      </header>

      <main className="px-4 space-y-3">
        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-3">الطلاب</h2>
          <div className="grid grid-cols-4 gap-2 text-center text-[12px]">
            <div><p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{active ?? 0}</p><p style={{ color: '#6f7974' }}>نشط</p></div>
            <div><p className="text-[18px] font-bold" style={{ color: '#d49a35' }}>{paused ?? 0}</p><p style={{ color: '#6f7974' }}>متوقف</p></div>
            <div><p className="text-[18px] font-bold" style={{ color: '#3d665a' }}>{trial ?? 0}</p><p style={{ color: '#6f7974' }}>تجريبي</p></div>
            <div><p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{withdrawn ?? 0}</p><p style={{ color: '#6f7974' }}>منسحب</p></div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-3">المالية — أكتوبر</h2>
          <div className="flex justify-between text-[14px] mb-1">
            <span style={{ color: '#6f7974' }}>المحصّل</span>
            <b style={{ color: '#176b52' }}>{collected.toLocaleString('ar-EG')} ج.م</b>
          </div>
          <div className="flex justify-between text-[14px]">
            <span style={{ color: '#6f7974' }}>عدد الدفعات</span>
            <b>{payments?.length ?? 0}</b>
          </div>
          <div className="flex justify-between text-[14px] mt-1">
            <span style={{ color: '#6f7974' }}>المعلمون النشطون</span>
            <b>{teachers ?? 0}</b>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-3">الحضور — أكتوبر</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[18px] font-bold">{totalAtt}</p><p className="text-[11px]" style={{ color: '#6f7974' }}>إجمالي</p></div>
            <div><p className="text-[18px] font-bold" style={{ color: '#176b52' }}>{present}</p><p className="text-[11px]" style={{ color: '#6f7974' }}>حاضر</p></div>
            <div><p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>{absent}</p><p className="text-[11px]" style={{ color: '#6f7974' }}>غائب</p></div>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-2">التقييمات</h2>
          <p className="text-[14px]">تقييمات أولياء الأمور: <b>{parentEvals?.length ?? 0}</b></p>
          <Link href="/admin/evaluations" className="text-[13px] font-semibold mt-2 inline-block" style={{ color: '#176b52' }}>عرض التقييمات ←</Link>
        </div>

        <div className="card p-4">
          <h2 className="text-[13px] font-bold mb-3">أعلى المستحقات</h2>
          <div className="space-y-2">
            {(dues ?? []).slice(0, 10).map((s: any) => (
              <Link key={s.id} href={`/admin/students/${s.id}`} className="flex justify-between text-[13px]">
                <span className="truncate">{s.name}</span>
                <b style={{ color: '#ba1a1a' }}>{Number(s.amount_due).toLocaleString('ar-EG')}</b>
              </Link>
            ))}
            {(!dues || dues.length === 0) && <p className="text-[12px]" style={{ color: '#6f7974' }}>لا مستحقات</p>}
          </div>
        </div>
      </main>
    </div>
  )
}
