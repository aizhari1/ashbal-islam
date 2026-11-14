import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentMonthKey, monthBounds, monthLabelAr } from '@/lib/dues'
import { fetchAllRows, methodLabel } from '@/lib/fetch-all'

export const dynamic = 'force-dynamic'
const PAGE = 50
const shiftMonth = (key: string, n: number) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7) }

export default async function SubscriptionsLogPage({ searchParams }: { searchParams: Promise<{ m?: string; p?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['admin', 'supervisor'].includes(String(prof?.role))) redirect('/login')

  const sp = await searchParams
  const all = sp.m === 'all'
  const thisMonth = currentMonthKey()
  const month = /^\d{4}-\d{2}$/.test(sp.m || '') ? (sp.m as string) : thisMonth
  const page = Math.max(1, Number(sp.p) || 1)
  const sb = serviceClient()

  // كل دفعات الفترة (على دفعات 1000) — الإجمالي والتقسيم حسب الطريقة، والصفحات 50 في الشاشة
  const rows = await fetchAllRows<any>((f, t) => {
    let q = sb.from('payments').select('id, amount, payment_date, method, notes, currency, students(name, code)').eq('status', 'مدفوع')
    if (!all) { const { start, end } = monthBounds(month); q = q.gte('payment_date', start).lte('payment_date', end) }
    return q.order('payment_date', { ascending: false }).order('created_at', { ascending: false }).range(f, t)
  })
  const total = rows.reduce((s, p) => s + Number(p.amount || 0), 0)
  const byMethod = new Map<string, { sum: number; n: number }>()
  for (const p of rows) { const k = methodLabel(p.method); const c = byMethod.get(k) || { sum: 0, n: 0 }; c.sum += Number(p.amount || 0); c.n++; byMethod.set(k, c) }
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(page, pages)
  const slice = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const mq = all ? 'all' : month
  const back = prof?.role === 'admin' ? '/admin/cashbox' : '/supervisor'

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href={back} className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">سجل الاشتراكات</h1>

      <div className="flex gap-2 overflow-x-auto py-2 text-[12px] font-bold">
        {[thisMonth, shiftMonth(thisMonth, -1), shiftMonth(thisMonth, -2)].map((m) => (
          <Link key={m} href={`/admin/subscriptions-log?m=${m}`} className="px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: !all && month === m ? '#176b52' : '#fff', color: !all && month === m ? '#fff' : '#3f4944', border: '1px solid #e5efe8' }}>{monthLabelAr(m)}</Link>
        ))}
        <Link href="/admin/subscriptions-log?m=all" className="px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: all ? '#176b52' : '#fff', color: all ? '#fff' : '#3f4944', border: '1px solid #e5efe8' }}>الكل</Link>
      </div>

      <p className="text-[13px] font-bold" style={{ color: '#176b52' }}>{rows.length} دفعة · إجمالي {Math.round(total).toLocaleString('en-US')} ج</p>
      <p className="text-[11px] mb-2" style={{ color: '#6f7974' }}>{[...byMethod.entries()].sort((a, b) => b[1].sum - a[1].sum).map(([m, v]) => `${m}: ${Math.round(v.sum).toLocaleString('en-US')} (${v.n})`).join(' · ')}</p>

      <div className="space-y-2 mt-3">
        {slice.map((p: any) => (
          <div key={p.id} className="card p-3 text-[13px] flex justify-between">
            <div>
              <p className="font-bold">{p.students?.name || '—'}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{p.payment_date} · {methodLabel(p.method)}</p>
            </div>
            <b style={{ color: '#176b52' }}>{Number(p.amount).toLocaleString('en-US')}</b>
          </div>
        ))}
        {rows.length === 0 && <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا دفعات في الفترة دي</p>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-[13px] font-bold">
          {cur > 1 ? <Link href={`/admin/subscriptions-log?m=${mq}&p=${cur - 1}`}>‹ السابق</Link> : <span className="opacity-30">‹ السابق</span>}
          <span style={{ color: '#6f7974' }}>صفحة {cur} / {pages}</span>
          {cur < pages ? <Link href={`/admin/subscriptions-log?m=${mq}&p=${cur + 1}`}>التالي ›</Link> : <span className="opacity-30">التالي ›</span>}
        </div>
      )}
    </div>
  )
}
