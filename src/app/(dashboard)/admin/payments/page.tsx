import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PAYMENT_METHODS, methodLabel, methodColor, normalizeMethod } from '@/lib/payment-methods'
import { recordPayment, updatePaymentMethod } from './actions'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function PaymentsPage({
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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'supervisor') redirect('/login')

  const monthKey = sp.month || 'all'
  const page = Math.max(1, Number(sp.page || 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // كل الدفعات (أو شهر محدد) — بدون حد أقصى وهمي
  let query = supabase
    .from('payments')
    .select('id, amount, payment_date, method, notes, student_id, students(name, code)', { count: 'exact' })
    .order('payment_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (monthKey !== 'all') {
    const [y, m] = monthKey.split('-').map(Number)
    const start = `${monthKey}-01`
    const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    query = query.gte('payment_date', start).lte('payment_date', end)
  }

  const { data: payments, count: totalCount } = await query.range(from, to)

  // عدّادات على كل الدفعات المطابقة للفلتر (نجيب methods+amount فقط)
  let statsQ = supabase.from('payments').select('amount, method')
  if (monthKey !== 'all') {
    const [y, m] = monthKey.split('-').map(Number)
    const start = `${monthKey}-01`
    const end = `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
    statsQ = statsQ.gte('payment_date', start).lte('payment_date', end)
  }
  // supabase default max 1000 — نجيب دفعات على دفعات لو أكتر
  const allForStats: { amount: number; method: string | null }[] = []
  let offset = 0
  const batch = 1000
  while (true) {
    const { data: chunk } = await statsQ.range(offset, offset + batch - 1)
    if (!chunk?.length) break
    allForStats.push(...chunk)
    if (chunk.length < batch) break
    offset += batch
    if (offset > 100000) break // حماية
  }

  const counts: Record<string, { count: number; total: number }> = {}
  for (const m of PAYMENT_METHODS) counts[m.id] = { count: 0, total: 0 }
  let grand = 0
  for (const p of allForStats) {
    const id = normalizeMethod(p.method)
    if (!counts[id]) counts[id] = { count: 0, total: 0 }
    counts[id].count += 1
    counts[id].total += Number(p.amount || 0)
    grand += Number(p.amount || 0)
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name')
    .in('status', ['نشط', 'موقوف'])
    .order('name')
    .limit(500)

  // آخر طريقة دفع لكل طالب
  const lastMethod: Record<string, { method: string; amount: number; date: string }> = {}
  let lo = 0
  while (true) {
    const { data: chunk } = await supabase
      .from('payments')
      .select('student_id, method, payment_date, amount')
      .order('payment_date', { ascending: false })
      .range(lo, lo + 999)
    if (!chunk?.length) break
    for (const p of chunk) {
      if (!p.student_id || lastMethod[p.student_id]) continue
      lastMethod[p.student_id] = {
        method: methodLabel(p.method),
        amount: Number(p.amount || 0),
        date: String(p.payment_date).slice(0, 10),
      }
    }
    if (chunk.length < 1000) break
    lo += 1000
    if (lo > 100000) break
  }

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE))

  const months: string[] = ['all']
  const base = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // إحصاء قاعدة البيانات الكامل
  const { count: dbPayments } = await supabase.from('payments').select('*', { count: 'exact', head: true })
  const { count: dbStudents } = await supabase.from('students').select('*', { count: 'exact', head: true })
  const { count: dbAttendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true })
  const { count: dbTeachers } = await supabase.from('teachers').select('*', { count: 'exact', head: true })

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
            كل الدفعات · إنستا · فودافون · بنكي
          </p>
        </div>
      </header>

      {/* تأكيد الاستيراد من الشيت */}
      <section className="px-4 mb-3">
        <div className="card p-3.5 text-[12px]" style={{ border: '1px solid #cde8dc' }}>
          <p className="font-bold mb-1" style={{ color: '#00513c' }}>
            بيانات قاعدة البيانات (من الشيت)
          </p>
          <div className="grid grid-cols-2 gap-1.5" style={{ color: '#3f4944' }}>
            <span>الدفعات: <b>{dbPayments ?? 0}</b></span>
            <span>الطلاب: <b>{dbStudents ?? 0}</b></span>
            <span>الحضور: <b>{dbAttendance ?? 0}</b></span>
            <span>المعلمون: <b>{dbTeachers ?? 0}</b></span>
          </div>
          <p className="mt-1.5 text-[10px]" style={{ color: '#6f7974' }}>
            آخر استيراد معروف: 201 دفعة · 159 طالب · 693 حضور · من أغسطس إلى أكتوبر 2026
          </p>
        </div>
      </section>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {months.map((mo) => (
          <Link
            key={mo}
            href={`/admin/payments?month=${mo}&page=1`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: mo === monthKey ? '#176b52' : '#fff',
              color: mo === monthKey ? '#fff' : '#3f4944',
              border: '1px solid #cde8dc',
            }}
          >
            {mo === 'all' ? 'الكل' : mo}
          </Link>
        ))}
      </div>

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
            الإجمالي المعروض · {totalCount ?? 0} دفعة
          </p>
          <p className="text-[22px] font-bold" style={{ color: '#176b52' }}>
            {grand.toLocaleString('ar-EG')} ج
          </p>
        </div>
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
