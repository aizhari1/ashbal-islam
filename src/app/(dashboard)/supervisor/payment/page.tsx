import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PAYMENT_METHODS } from '@/lib/payment-methods'
import { supervisorRecordPayment } from './actions'
import { todayKey } from '@/lib/dues'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export default async function SupervisorPaymentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, amount_due')
    .in('status', ['نشط', 'موقوف', 'تجريبي'])
    .order('name')
    .limit(400)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/supervisor" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تسجيل اشتراك (دفعة)
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            إنستا باي · فودافون كاش · تحويل بنكي
          </p>
        </div>
      </header>

      <div className="px-4">
        <form action={supervisorRecordPayment} className="card p-4 space-y-3">
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
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
                {s.name} ({s.code}) — مستحق {Number(s.amount_due || 0)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="amount"
              type="number"
              min={1}
              required
              placeholder="المبلغ"
              className="rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <input
              name="payment_date"
              type="date"
              defaultValue={todayKey()}
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
          <button type="submit" className="w-full py-3 rounded-2xl text-white font-bold text-[14px]" style={{ background: '#176b52' }}>
            حفظ الدفعة
          </button>
        </form>
      </div>
    </div>
  )
}
