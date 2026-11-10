'use client'

import { PaymentForm } from '@/components/PaymentForm'
import { todayKey } from '@/lib/dues'
import { recordPayment } from '@/app/actions/payments'

const METHODS = [
  { value: 'instapay', label: 'إنستا باي' },
  { value: 'vodafone', label: 'فودافون كاش' },
  { value: 'bank', label: 'تحويل بنكي' },
  { value: 'cash', label: 'كاش' },
]

export function RecordPaymentForm({
  students,
  defaultDate,
}: {
  students: { id: string; code: string; name: string; amount_due?: number | null }[]
  defaultDate?: string
}) {
  const date = defaultDate || todayKey()
  return (
    <PaymentForm
      students={students}
      methods={METHODS}
      defaultDate={date}
      onSubmit={recordPayment}
    />
  )
}
