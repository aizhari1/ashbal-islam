import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CashboxForm } from './CashboxForm'
import { currentMonthKey, monthBounds, monthLabelAr, todayKey } from '@/lib/dues'
import { fetchAllRows, methodLabel } from '@/lib/fetch-all'

export const dynamic = 'force-dynamic'

const shiftMonth = (key: string, n: number) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7)
}
const addDay = (s: string, n: number) => new Date(new Date(s + 'T12:00:00Z').getTime() + n * 86400000).toISOString()
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

export default async function CashboxPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (prof?.role !== 'admin') redirect('/login')

  const sp = await searchParams
  const thisMonth = currentMonthKey()
  const month = /^\d{4}-\d{2}$/.test(sp.m || '') ? (sp.m as string) : thisMonth
  const { start, end } = monthBounds(month)
  const sb = serviceClient()

  // الإيرادات والمصروفات بتاعت الشهر المختار بس — بتبدأ من صفر أول كل شهر
  const [payments, expenseRaw] = await Promise.all([
    fetchAllRows<any>((f, t) =>
      sb.from('payments').select('id, amount, payment_date, method, students(name, code)').eq('status', 'مدفوع').gte('payment_date', start).lte('payment_date', end).order('payment_date', { ascending: false }).range(f, t)
    ),
    fetchAllRows<any>((f, t) =>
      sb.from('activity_log').select('id, details, created_at').eq('action', 'finance_expense').gte('created_at', addDay(start, -1)).lte('created_at', addDay(end, 2)).order('created_at', { ascending: false }).range(f, t)
    ),
  ])
  // نفلتر على يوم القاهرة الفعلي
  const expenses = expenseRaw.filter((e) => { const d = todayKey(new Date(e.created_at)); return d >= start && d <= end })

  const income = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.details?.amount || 0), 0)
  const balance = income - expenseTotal

  const byMethod = new Map<string, { sum: number; n: number }>()
  for (const p of payments) {
    const k = methodLabel(p.method)
    const cur = byMethod.get(k) || { sum: 0, n: 0 }
    cur.sum += Number(p.amount || 0); cur.n++
    byMethod.set(k, cur)
  }
  const methodRows = [...byMethod.entries()].sort((a, b) => b[1].sum - a[1].sum)
  const byCategory = new Map<string, number>()
  for (const e of expenses) byCategory.set(e.details?.category || 'مصروف', (byCategory.get(e.details?.category || 'مصروف') || 0) + Number(e.details?.amount || 0))

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="text-[#0d9b8a] text-lg">←</Link>
        <h1 className="text-[16px] font-bold">الصندوق المالي</h1>
      </header>

      <main className="px-4 pb-28">
        <div className="flex items-center justify-between bg-white rounded-2xl p-2.5 shadow-sm mb-3 text-[13px] font-bold">
          <Link href={`/admin/cashbox?m=${shiftMonth(month, -1)}`} className="px-3 py-1">‹ {monthLabelAr(shiftMonth(month, -1))}</Link>
          <span style={{ color: '#176b52' }}>{monthLabelAr(month)}{month === thisMonth ? ' (الشهر الحالي)' : ''}</span>
          {month < thisMonth ? <Link href={`/admin/cashbox?m=${shiftMonth(month, 1)}`} className="px-3 py-1">{monthLabelAr(shiftMonth(month, 1))} ›</Link> : <span className="px-3 py-1 opacity-30">›</span>}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">إيرادات</p>
            <p className="text-[16px] font-bold text-[#0d9b8a]">{fmt(income)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">مصروفات</p>
            <p className="text-[16px] font-bold text-[#ba1a1a]">{fmt(expenseTotal)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[11px] text-[#6f7974]">الرصيد</p>
            <p className="text-[16px] font-bold" style={{ color: balance < 0 ? '#ba1a1a' : undefined }}>{fmt(balance)}</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h2 className="text-[14px] font-bold mb-3">المحصَّل حسب طريقة الدفع</h2>
          {methodRows.length === 0 && <p className="text-[12px] text-[#6f7974]">لا إيرادات في الشهر ده</p>}
          {methodRows.map(([m, v]) => {
            const pct = income ? Math.round((v.sum / income) * 100) : 0
            return (
              <div key={m} className="mb-2.5">
                <div className="flex justify-between text-[13px]"><span className="font-semibold">{m} <span className="text-[11px] text-[#6f7974]">({v.n} دفعة)</span></span><b>{fmt(v.sum)} ج</b></div>
                <div className="h-2 rounded-full overflow-hidden mt-1" style={{ background: '#e2f1eb' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#0d9b8a' }} /></div>
              </div>
            )
          })}
        </section>

        {month === thisMonth && (
          <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h2 className="text-[14px] font-bold mb-3">تسجيل مصروف</h2>
            <CashboxForm />
          </section>
        )}

        <h2 className="text-[14px] font-bold mb-2">مصروفات {monthLabelAr(month)} ({expenses.length})</h2>
        {byCategory.size > 0 && (
          <p className="text-[11px] text-[#6f7974] mb-2">{[...byCategory.entries()].map(([c, v]) => `${c}: ${fmt(v)}`).join(' · ')}</p>
        )}
        <div className="space-y-2 mb-5">
          {expenses.map((e) => {
            const d = e.details as { amount?: number; category?: string; description?: string }
            return (
              <div key={e.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px] shadow-sm">
                <div>
                  <p className="font-semibold">{d?.category || 'مصروف'}</p>
                  <p className="text-[11px] text-[#6f7974]">{d?.description || todayKey(new Date(e.created_at))}</p>
                </div>
                <span className="font-bold text-[#ba1a1a]">-{Number(d?.amount || 0).toLocaleString('en-US')}</span>
              </div>
            )
          })}
          {expenses.length === 0 && <p className="text-[12px] text-[#6f7974] bg-white rounded-xl p-3">لا مصروفات في الشهر ده</p>}
        </div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-bold">إيرادات {monthLabelAr(month)} ({payments.length})</h2>
          <Link href={`/admin/subscriptions-log?m=${month}`} className="text-[12px] font-bold" style={{ color: '#176b52' }}>كل الدفعات ←</Link>
        </div>
        <div className="space-y-2">
          {payments.slice(0, 20).map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px] shadow-sm">
              <div>
                <p className="font-semibold">{p.students?.name || '—'}</p>
                <p className="text-[11px] text-[#6f7974]">{p.payment_date} · {methodLabel(p.method)}</p>
              </div>
              <span className="font-bold text-[#0d9b8a]">+{Number(p.amount).toLocaleString('en-US')}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
