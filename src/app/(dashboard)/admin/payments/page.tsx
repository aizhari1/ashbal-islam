import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PAYMENT_METHODS, methodLabel, methodColor, normalizeMethod } from '@/lib/payment-methods'
import { recordPayment, updatePaymentMethod } from './actions'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'supervisor') redirect('/login')

  const now = new Date()
  const monthKey = sp.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [y, m] = monthKey.split('-').map(Number)
  const start = `${monthKey}-01`
  const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`

  const [{ data: payments }, { data: students }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, payment_date, method, notes, student_id, students(name, code)')
      .gte('payment_date', start)
      .lte('payment_date', end)
      .order('payment_date', { ascending: false })
      .limit(500),
    supabase.from('students').select('id, code, name').eq('status', 'نشط').order('name').limit(300),
  ])

  const counts: Record<string, { count: number; total: number }> = {}
  for (const m of PAYMENT_METHODS) counts[m.id] = { count: 0, total: 0 }

  let grand = 0
  for (const p of payments ?? []) {
    const id = normalizeMethod(p.method)
    if (!counts[id]) counts[id] = { count: 0, total: 0 }
    counts[id].count += 1
    counts[id].total += Number(p.amount || 0)
    grand += Number(p.amount || 0)
  }

  // آخر طريقة دفع لكل طالب (من كل المدفوعات)
  const { data: allPays } = await supabase
    .from('payments')
    .select('student_id, method, payment_date, amount')
    .order('payment_date', { ascending: false })
    .limit(2000)

  const lastMethod: Record<string, { method: string; amount: number; date: string }> = {}
  for (const p of allPays ?? []) {
    if (!p.student_id || lastMethod[p.student_id]) continue
    lastMethod[p.student_id] = {
      method: methodLabel(p.method),
      amount: Number(p.amount || 0),
      date: String(p.payment_date).slice(0, 10),
    }
  }

  const months: string[] = []
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            المدفوعات وطرق الدفع
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            إنستا باي · فودافون كاش · تحويل بنكي
          </p>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {months.map((mo) => (
          <Link
            key={mo}
            href={`/admin/payments?month=${mo}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: mo === monthKey ? '#176b52' : '#fff',
              color: mo === monthKey ? '#fff' : '#3f4944',
              border: '1px solid #cde8dc',
            }}
          >
            {mo}
          </Link>
        ))}
      </div>

      {/* عدّادات */}
      <section className="px-4 mb-4 grid grid-cols-2 gap-2.5">
        {PAYMENT_METHODS.filter((m) => m.id !== 'اخرى').map((m) => (
          <div key={m.id} className="card p-3.5">
            <p className="text-[12px] font-semibold" style={{ color: methodColor(m.id) }}>
              {m.label}
            </p>
            <p className="text-[22px] font-bold" style={{ color: '#00513c' }}>
              {counts[m.id]?.count ?? 0}
            </p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              {(counts[m.id]?.total ?? 0).toLocaleString('ar-EG')} ج
            </p>
          </div>
        ))}
        <div className="card p-3.5 col-span-2">
          <p className="text-[12px]" style={{ color: '#6f7974' }}>
            إجمالي الشهر · {payments?.length ?? 0} دفعة
          </p>
          <p className="text-[22px] font-bold" style={{ color: '#176b52' }}>
            {grand.toLocaleString('ar-EG')} ج
          </p>
          {(counts['اخرى']?.count ?? 0) > 0 && (
            <p className="text-[11px] mt-1" style={{ color: '#6f7974' }}>
              أخرى: {counts['اخرى'].count} · {counts['اخرى'].total.toLocaleString('ar-EG')} ج
            </p>
          )}
        </div>
      </section>

      {/* تسجيل دفعة */}
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
              required
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
              defaultValue="تحويل_بنكي"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <input
              name="notes"
              placeholder="ملاحظة (اختياري)"
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

      {/* قائمة الدفعات */}
      <section className="px-4 mb-4">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>
          دفعات الشهر
        </h2>
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
                </div>
                <div className="text-left shrink-0">
                  <p className="text-[14px] font-bold" style={{ color: '#176b52' }}>
                    {Number(p.amount).toLocaleString('ar-EG')} ج
                  </p>
                  <span
                    className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: methodColor(p.method) }}
                  >
                    {methodLabel(p.method)}
                  </span>
                </div>
              </div>
              <form action={updatePaymentMethod} className="mt-2 flex gap-2 items-center">
                <input type="hidden" name="id" value={p.id} />
                <select
                  name="method"
                  defaultValue={normalizeMethod(p.method)}
                  className="flex-1 rounded-lg border px-2 py-1.5 text-[11px] bg-white"
                  style={{ borderColor: '#cde8dc' }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: '#eefdf6', color: '#176b52' }}
                >
                  تعديل
                </button>
              </form>
            </div>
          ))}
          {(payments ?? []).length === 0 && (
            <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
              لا دفعات في هذا الشهر
            </p>
          )}
        </div>
      </section>

      {/* آخر طريقة دفع لكل طالب نشط */}
      <section className="px-4 mb-6">
        <h2 className="text-[13px] font-bold mb-2" style={{ color: '#3f4944' }}>
          آخر طريقة دفع جنب كل طالب
        </h2>
        <div className="card divide-y" style={{ borderColor: '#e8f5ef' }}>
          {(students ?? [])
            .map((s) => ({
              ...s,
              last: lastMethod[s.id],
            }))
            .filter((s) => s.last)
            .slice(0, 80)
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
                    {s.last!.amount.toLocaleString('ar-EG')} ج
                  </p>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}
