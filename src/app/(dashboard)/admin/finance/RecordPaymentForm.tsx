'use client'

import { PaymentForm } from '@/components/PaymentForm'
import { recordPayment } from '@/app/actions/payments'

const METHODS = [
  { id: 'انستا_باي', label: 'إنستا باي' },
  { id: 'فودافون_كاش', label: 'فودافون كاش' },
  { id: 'تحويل_بنكي', label: 'تحويل بنكي' },
  { id: 'اخرى', label: 'أخرى' },
]

export function RecordPaymentForm({
  students,
  defaultDate,
}: {
  students: { id: string; code: string; name: string; amount_due?: number | null }[]
  defaultDate?: string
}) {
  const date = defaultDate || new Date().toISOString().slice(0, 10)
  return (
    <PaymentForm
      students={students}
      methods={METHODS}
      action={async (fd) => {
        const r = await recordPayment(fd)
        if (r && 'error' in r && r.error) return { error: String(r.error) }
        return { success: true }
      }}
      defaultDate={date}
    />
  )
}
