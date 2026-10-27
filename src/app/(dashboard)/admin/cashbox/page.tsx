import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CashboxForm } from './CashboxForm'

export default async function CashboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, method, notes, students(name)')
    .order('payment_date', { ascending: false })
    .limit(100)

  const income = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)

  const { data: expensesLog } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'finance_expense')
    .order('created_at', { ascending: false })
    .limit(50)

  const expenseTotal = (expensesLog ?? []).reduce((s, e) => {
    const amt = Number((e.details as { amount?: number })?.amount || 0)
    return s + amt
  }, 0)

  const balance = income - expenseTotal

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="text-[#0d9b8a] text-lg">←</Link>
        <h1 className="text-[16px] font-bold">الصندوق المالي</h1>
      </header>

      <main className="px-4 pb-28">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">إيرادات</p>
            <p className="text-[16px] font-bold text-[#0d9b8a]">{income.toLocaleString('ar-EG')}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">مصروفات</p>
            <p className="text-[16px] font-bold text-[#ba1a1a]">{expenseTotal.toLocaleString('ar-EG')}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">الرصيد</p>
            <p className="text-[16px] font-bold">{balance.toLocaleString('ar-EG')}</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="text-[14px] font-bold mb-3">تسجيل مصروف</h2>
          <CashboxForm />
        </section>

        <h2 className="text-[14px] font-bold mb-2">آخر المصروفات</h2>
        <div className="space-y-2 mb-5">
          {(expensesLog ?? []).map((e) => {
            const d = e.details as { amount?: number; category?: string; description?: string }
            return (
              <div key={e.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px] shadow-sm">
                <div>
                  <p className="font-semibold">{d?.category || 'مصروف'}</p>
                  <p className="text-[11px] text-[#6f7974]">{d?.description || e.created_at?.slice(0, 10)}</p>
                </div>
                <span className="font-bold text-[#ba1a1a]">-{Number(d?.amount || 0).toLocaleString('ar-EG')}</span>
              </div>
            )
          })}
        </div>

        <h2 className="text-[14px] font-bold mb-2">إيرادات (من المدفوعات)</h2>
        <div className="space-y-2">
          {(payments ?? []).slice(0, 15).map((p: { id: string; amount: number; payment_date: string; method: string | null; students: { name: string } | null }) => (
            <div key={p.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px] shadow-sm">
              <div>
                <p className="font-semibold">{p.students?.name || '—'}</p>
                <p className="text-[11px] text-[#6f7974]">{p.payment_date} · {p.method}</p>
              </div>
              <span className="font-bold text-[#0d9b8a]">+{Number(p.amount).toLocaleString('ar-EG')}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
