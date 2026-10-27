import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PaySupervisorForm } from './PaySupervisorForm'

export default async function SupervisorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: supervisors } = await supabase
    .from('profiles')
    .select('id, code, full_name')
    .eq('role', 'supervisor')
    .order('full_name')

  const { data: pays } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'supervisor_pay')
    .order('created_at', { ascending: false })
    .limit(100)

  const paidByName: Record<string, number> = {}
  for (const p of pays ?? []) {
    const d = p.details as { name?: string; amount?: number }
    if (d?.name) paidByName[d.name] = (paidByName[d.name] || 0) + Number(d.amount || 0)
  }

  const defaultSalary: Record<string, number> = { 'مروان': 55, 'marwan': 55 }

  const rows = (supervisors ?? []).map((s) => {
    const salary = defaultSalary[s.full_name] ?? defaultSalary[s.full_name?.toLowerCase() || ''] ?? 0
    const paid = paidByName[s.full_name] || 0
    return { ...s, salary, paid, remaining: Math.max(0, salary - paid) }
  })

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="bg-[#0f5c4c] text-white px-4 py-3 text-center font-bold">
        رواتب الإشراف
      </header>
      <main className="px-4 py-4 pb-28">
        <Link href="/admin" className="text-[#0d9b8a] text-[13px]">← الرئيسية</Link>
        <h2 className="text-[14px] font-bold mb-2 text-[#0f5c4c] mt-2">جدول الرواتب</h2>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <div className="grid grid-cols-4 gap-1 px-3 py-2 text-[11px] font-bold text-[#6f7974] border-b">
            <span>المشرف</span>
            <span className="text-center">الراتب</span>
            <span className="text-center">المدفوع</span>
            <span className="text-center">المتبقي</span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-4 gap-1 px-3 py-2.5 text-[13px] border-b last:border-0">
              <span className="font-medium truncate">{r.full_name}</span>
              <span className="text-center">{r.salary}</span>
              <span className="text-center">{r.paid}</span>
              <span className="text-center font-bold text-[#0d9b8a]">{r.remaining}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="p-4 text-[12px] text-[#6f7974]">لا مشرفين</p>}
        </div>
        <PaySupervisorForm supervisors={(supervisors ?? []).map((s) => s.full_name)} />
      </main>
    </div>
  )
}
