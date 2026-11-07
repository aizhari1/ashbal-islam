'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Student = {
  id: string
  code: string
  name: string
  amount_due?: number | null
}

type Method = { id: string; label: string }

export function PaymentForm({
  students,
  methods,
  action,
  defaultDate,
}: {
  students: Student[]
  methods: Method[]
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean; success?: boolean } | void>
  defaultDate: string
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [receiptName, setReceiptName] = useState('')
  const [prepaid, setPrepaid] = useState(false)
  const [months, setMonths] = useState(2)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students.slice(0, 30)
    return students
      .filter((s) => {
        const name = (s.name || '').toLowerCase()
        const code = (s.code || '').toLowerCase()
        return name.includes(term) || code.includes(term)
      })
      .slice(0, 40)
  }, [q, students])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) {
      setMsg({ type: 'err', text: 'اختار طالب من البحث أولاً' })
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('student_id', selected.id)
    fd.set('prepaid_months', prepaid ? String(months) : '0')
    if (!fd.get('idempotency_key')) {
      fd.set('idempotency_key', crypto.randomUUID())
    }
    setMsg(null)
    startTransition(async () => {
      const r = await action(fd)
      if (r && 'error' in r && r.error) {
        setMsg({ type: 'err', text: `فشل: ${r.error}` })
      } else {
        setMsg({
          type: 'ok',
          text: prepaid
            ? `تم · دفع مقدم ${months} شهر — مش هيظهر في المستحقات غير بعد انتهائها ✓`
            : 'تم تسجيل الدفعة بنجاح ✓',
        })
        form.reset()
        setSelected(null)
        setQ('')
        setReceiptName('')
        setPrepaid(false)
        setMonths(2)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3" encType="multipart/form-data">
      {msg && (
        <div
          className="rounded-xl px-3 py-2.5 text-[13px] font-bold text-center"
          style={{
            background: msg.type === 'ok' ? '#e8f7f0' : '#fce8e8',
            color: msg.type === 'ok' ? '#176b52' : '#ba1a1a',
          }}
        >
          {msg.text}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          ابحث عن الطالب
        </label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اسم أو كود..."
          className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
          style={{ borderColor: '#cde8dc' }}
          disabled={!!selected}
        />
        {!selected && (
          <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border bg-white" style={{ borderColor: '#e5efe8' }}>
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="w-full text-right px-3 py-2 border-b last:border-0 text-[13px]"
                style={{ borderColor: '#f0f5f2' }}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="text-[11px]" style={{ color: '#6f7974' }}>
                  {' '}
                  ({s.code})
                </span>
              </button>
            ))}
          </div>
        )}
        {selected && (
          <div className="mt-2 flex justify-between items-center rounded-xl px-3 py-2" style={{ background: '#e8f7f0' }}>
            <span className="text-[13px] font-bold" style={{ color: '#00513c' }}>
              {selected.name} ({selected.code})
            </span>
            <button
              type="button"
              className="text-[11px] underline"
              style={{ color: '#6f7974' }}
              onClick={() => {
                setSelected(null)
                setQ('')
              }}
            >
              تغيير
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
            المبلغ
          </label>
          <input
            name="amount"
            type="number"
            min={1}
            step="0.5"
            required
            placeholder="0"
            className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
            style={{ borderColor: '#cde8dc' }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
            التاريخ
          </label>
          <input
            name="payment_date"
            type="date"
            defaultValue={defaultDate}
            className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
            style={{ borderColor: '#cde8dc' }}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          طريقة الدفع
        </label>
        <select
          name="method"
          required
          defaultValue={methods[0]?.id || ''}
          className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
          style={{ borderColor: '#cde8dc' }}
        >
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* دفع مقدم */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: '#f4faf7', border: '1px solid #cde8dc' }}>
        <label className="flex items-center gap-2 text-[13px] font-bold" style={{ color: '#00513c' }}>
          <input
            type="checkbox"
            checked={prepaid}
            onChange={(e) => setPrepaid(e.target.checked)}
            className="w-4 h-4"
          />
          دفع مقدم (عدة شهور)
        </label>
        {prepaid && (
          <>
            <label className="block text-[11px] font-bold" style={{ color: '#3f4944' }}>
              عدد الشهور المدفوعة
            </label>
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'شهر' : 'شهور'}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>
              مثال: دافع نوفمبر وديسمبر (شهرين) → مش هيظهر في المستحقات غير من يناير.
              المستحق بيتصفّر طول فترة المقدم.
            </p>
          </>
        )}
      </div>

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          سكرين شوت التحويل <span style={{ color: '#6f7974', fontWeight: 500 }}>(اختياري)</span>
        </label>
        <input
          name="receipt"
          type="file"
          accept="image/*,.pdf"
          className="w-full text-[12px]"
          onChange={(e) => setReceiptName(e.target.files?.[0]?.name || '')}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          {receiptName ? `تم اختيار: ${receiptName}` : 'مش إجباري — لو حابب ترفق صورة الإيصال'}
        </p>
      </div>

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          ملاحظة
        </label>
        <input
          name="notes"
          placeholder="اختياري"
          className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
          style={{ borderColor: '#cde8dc' }}
        />
      </div>

      <button
        type="submit"
        disabled={pending || !selected}
        className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-50"
        style={{ background: '#176b52' }}
      >
        {pending ? 'جاري الحفظ...' : prepaid ? `حفظ دفع مقدم (${months} شهر)` : 'حفظ الدفعة'}
      </button>
    </form>
  )
}
