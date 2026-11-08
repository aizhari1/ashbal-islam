import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PAYMENT_METHODS } from '@/lib/payment-methods'
import { supervisorRecordPayment } from './actions'
import { todayKey } from '@/lib/dues'
import { PaymentForm } from '@/components/PaymentForm'

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
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تسجيل اشتراك (دفعة)
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            بحث · دفعة عادية أو دفع مقدم بعدة شهور
          </p>
        </div>
      </header>

      <div className="px-4 mb-3 space-y-2">
        <div
          className="rounded-2xl px-3 py-2.5 text-[12px] font-bold"
          style={{ background: '#fff8e6', color: '#5c4500', border: '1px solid #e8b84a' }}
        >
          فوق في الفورم: مربع أصفر «دفع مقدم» — علّمه واختار عدد الشهور
        </div>
        <Link
          href="/admin/payments"
          className="block text-center rounded-2xl px-3 py-2.5 text-[13px] font-bold text-white"
          style={{ background: '#755b1b' }}
        >
          عرض / تعديل / حذف الدفعات المسجّلة ←
        </Link>
      </div>

      <div className="px-4">
        <PaymentForm
          students={(students ?? []).map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            amount_due: s.amount_due,
          }))}
          methods={PAYMENT_METHODS.map((m) => ({ id: m.id, label: m.label }))}
          action={supervisorRecordPayment}
          defaultDate={todayKey()}
        />
      </div>
    </div>
  )
}
