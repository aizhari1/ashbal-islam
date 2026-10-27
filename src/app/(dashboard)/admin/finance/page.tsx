import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RecordPaymentForm } from './RecordPaymentForm'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, currency, payment_date, method, status, students(code, name)')
    .order('payment_date', { ascending: false })
    .limit(50)

  const { data: dues } = await supabase
    .from('students')
    .select('id, code, name, amount_due, currency, status')
    .gt('amount_due', 0)
    .order('amount_due', { ascending: false })
    .limit(30)

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name')
    .eq('status', 'نشط')
    .order('name')

  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalDue = (dues ?? []).reduce((s, d) => s + Number(d.amount_due || 0), 0)

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#eefdf6]/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold text-[#111e1a]">المالية والمدفوعات</h1>
      </header>

      <main className="px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] text-[#6f7974]">المحصّل</p>
            <p className="text-[20px] font-bold text-[#176b52]">{totalPaid.toLocaleString('ar-EG')} ج.م</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] text-[#6f7974]">المستحقات</p>
            <p className="text-[20px] font-bold text-[#ba1a1a]">{totalDue.toLocaleString('ar-EG')} ج.م</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="text-[14px] font-bold mb-3">تسجيل دفعة</h2>
          <RecordPaymentForm students={students ?? []} />
        </section>

        <h2 className="text-[14px] font-bold mb-2">مستحقات مفتوحة</h2>
        <div className="space-y-2 mb-5">
          {(dues ?? []).map((d) => (
            <Link key={d.id} href={`/admin/students/${d.id}`}
              className="flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm">
              <div>
                <p className="text-[14px] font-bold">{d.name}</p>
                <p className="text-[11px] text-[#6f7974]">{d.code}</p>
              </div>
              <span className="text-[14px] font-bold text-[#ba1a1a]">{Number(d.amount_due).toLocaleString('ar-EG')}</span>
            </Link>
          ))}
        </div>

        <h2 className="text-[14px] font-bold mb-2">آخر المدفوعات</h2>
        <div className="space-y-2">
          {(payments ?? []).map((p: { id: string; amount: number; payment_date: string; method: string | null; students: { name: string } | null }) => (
            <div key={p.id} className="bg-white rounded-2xl p-3.5 shadow-sm flex justify-between gap-2">
              <div>
                <p className="text-[14px] font-semibold">{p.students?.name || '—'}</p>
                <p className="text-[11px] text-[#6f7974]">{p.payment_date} · {p.method || '—'}</p>
              </div>
              <span className="text-[14px] font-bold text-[#176b52]">+{Number(p.amount).toLocaleString('ar-EG')}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
