import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PAYMENT_METHODS, methodLabel, methodColor, normalizeMethod } from '@/lib/payment-methods'
import { recordPayment } from './actions'
import { PaymentRowActions } from './PaymentRowActions'

export const dynamic = 'force-dynamic'

function monthKeyNow() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile && !['admin', 'supervisor'].includes(profile.role || '')) redirect('/login')

  const monthKey = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthKeyNow()
  const page = Math.max(1, Number(sp.page || 1) || 1)
  const pageSize = 30
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const start = `${monthKey}-01`
  const [y, m] = monthKey.split('-').map(Number)
  const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`

  let listQ = supabase
    .from('payments')
    .select('id, amount, payment_date, method, notes, student_id, students(name, code)', { count: 'exact' })
    .gte('payment_date', start)
    .lte('payment_date', end)
    .order('payment_date', { ascending: false })
    .range(from, to)

  const { data: payments, count: totalCount, error: listErr } = await listQ
  if (listErr) {
    console.error(listErr)
  }

  let statsQ = supabase.from('payments').select('amount, method').gte('payment_date', start).lte('payment_date', end)
  const { data: statsRows } = await statsQ

  const allForStats: { amount: number; method: string | null }[] = statsRows ?? []
  const counts: Record<string, { total: number; count: number }> = {}
  let grand = 0
  for (const p of allForStats) {
    const id = normalizeMethod(p.method)
    if (!counts[id]) counts[id] = { total: 0, count: 0 }
    counts[id].total += Number(p.amount || 0)
    counts[id].count += 1
    grand += Number(p.amount || 0)
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name')
    .in('status', ['نشط', 'موقوف', 'تجريبي'])
    .order('name')
    .limit(600)

  const lastMethod: Record<string, { method: string; amount: number; date: string }> = {}
  {
    const { data: recent } = await supabase
      .from('payments')
      .select('student_id, method, payment_date, amount')
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false })
      .limit(800)
    for (const p of recent ?? []) {
      if (!p.student_id || lastMethod[p.student_id]) continue
      lastMethod[p.student_id] = {
        method: normalizeMethod(p.method),
        amount: Number(p.amount || 0),
        date: String(p.payment_date).slice(0, 10),
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize))
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            الدفعات والاشتراكات
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {monthLabel} · تسجيل · تعديل · حذف
          </p>
        </div>
      </header>

      <section className="px-4 mb-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[-1, 0, 1].map((off) => {
            const d = new Date(y, m - 1 + off, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const label = d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' })
            const active = key === monthKey
            return (
              <Link
                key={key}
                href={`/admin/payments?month=${key}`}
                className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{
                  background: active ? '#176b52' : '#fff',
                  color: active ? '#fff' : '#176b52',
                  border: active ? 'none' : '1px solid #cde8dc',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>
        <p className="text-[13px] font-bold mt-2" style={{ color: '#176b52' }}>
          إجمالي الشهر: {grand.toLocaleString('en-US')} ج · {(totalCount || 0).toLocaleString('en-US')} دفعة
        </p>
      </section>

      <section className="px-4 mb-4">
        <div className="card p-4">
          <h2 className="text-[14px] font-bold mb-3" style={{ color: '#00513c' }}>
            تسجيل دفعة جديدة
          </h2>
          <form action={recordPayment} className="space-y-2.5">
            <select
              name="student_id"
              required
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
              defaultValue=""
            >
              <option value="" disabled>
                اختر الطالب
              </option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="amount"
                type="number"
                min={1}
                step={1}
                required
                placeholder="المبلغ"
                className="rounded-xl border px-3 py-2.5 text-[13px]"
                style={{ borderColor: '#cde8dc' }}
              />
              <input
                name="payment_date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-xl border px-3 py-2.5 text-[13px]"
                style={{ borderColor: '#cde8dc' }}
              />
            </div>
            <select
              name="method"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
              defaultValue={PAYMENT_METHODS[0]?.id}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="rounded-xl px-3 py-2" style={{ background: '#fff8e6', border: '1px solid #e8b84a' }}>
              <label className="flex items-center gap-2 text-[12px] font-bold" style={{ color: '#5c4500' }}>
                <input type="checkbox" name="prepaid_toggle" value="1" id="prepaid_toggle" className="scale-110" />
                دفع مقدم (عدة شهور)
              </label>
              <select
                name="prepaid_months"
                defaultValue="0"
                className="mt-2 w-full rounded-lg border px-2 py-1.5 text-[12px] bg-white"
                style={{ borderColor: '#e8b84a' }}
              >
                <option value="0">عادي (شهر واحد / بدون مقدم)</option>
                <option value="1">شهر واحد مقدم</option>
                <option value="2">شهرين</option>
                <option value="3">3 شهور</option>
                <option value="4">4 شهور</option>
                <option value="6">6 شهور</option>
              </select>
            </div>
            <input
              name="notes"
              placeholder="ملاحظات (اختياري)"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-white text-[14px] font-bold"
              style={{ background: '#176b52' }}
            >
              حفظ الدفعة
            </button>
          </form>
        </div>
      </section>

      <section className="px-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-[13px] font-bold" style={{ color: '#3f4944' }}>
            كل الدفعات
          </h2>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            صفحة {page} / {totalPages} · {totalCount ?? 0} دفعة
          </p>
        </div>
        <div className="space-y-2">
          {(payments ?? []).map((p: any) => (
            <div key={p.id} className="card p-3">
              <div className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: '#1a1c1b' }}>
                    {p.students?.name || '—'}
                  </p>
                  <p className="text-[11px]" style={{ color: '#6f7974' }}>
                    {p.students?.code} · {String(p.payment_date).slice(0, 10)}
                  </p>
                  {p.notes && (
                    <p className="text-[11px] mt-0.5" style={{ color: '#6f7974' }}>
                      {p.notes}
                    </p>
                  )}
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[14px] font-bold" style={{ color: '#176b52' }}>
                    {Number(p.amount).toLocaleString('en-US')} ج
                  </p>
                  <span
                    className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: methodColor(p.method) }}
                  >
                    {methodLabel(p.method)}
                  </span>
                </div>
              </div>
              <PaymentRowActions
                payment={{
                  id: p.id,
                  amount: Number(p.amount || 0),
                  payment_date: String(p.payment_date || ''),
                  method: p.method,
                  notes: p.notes || null,
                  students: p.students,
                }}
              />
            </div>
          ))}
          {(payments ?? []).length === 0 && (
            <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
              لا دفعات
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-4">
            {page > 1 && (
              <Link
                href={`/admin/payments?month=${monthKey}&page=${page - 1}`}
                className="px-4 py-2 rounded-full text-[13px] font-bold bg-white"
                style={{ border: '1px solid #cde8dc', color: '#176b52' }}
              >
                السابق
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/payments?month=${monthKey}&page=${page + 1}`}
                className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
                style={{ background: '#176b52' }}
              >
                التالي
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="px-4 mb-6">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>
          آخر طريقة دفع جنب كل طالب
        </h2>
        <div className="card divide-y" style={{ borderColor: '#e8f5ef' }}>
          {(students ?? [])
            .map((s) => ({ ...s, last: lastMethod[s.id] }))
            .filter((s) => s.last)
            .map((s) => (
              <div key={s.id} className="px-3 py-2.5 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">{s.name}</p>
                  <p className="text-[10px]" style={{ color: '#6f7974' }}>
                    {s.code} · {s.last!.date}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: methodColor(s.last!.method) }}
                  >
                    {s.last!.method}
                  </span>
                  <p className="text-[11px] mt-0.5" style={{ color: '#176b52' }}>
                    {s.last!.amount.toLocaleString('en-US')} ج
                  </p>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
