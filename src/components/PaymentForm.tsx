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
    if (!fd.get('idempotency_key')) {
      fd.set('idempotency_key', crypto.randomUUID())
    }
    setMsg(null)
    startTransition(async () => {
      const r = await action(fd)
      if (r && 'error' in r && r.error) {
        setMsg({ type: 'err', text: `فشل: ${r.error}` })
      } else {
        setMsg({ type: 'ok', text: 'تم تسجيل الدفعة بنجاح ✓' })
        form.reset()
        setSelected(null)
        setQ('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
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
          onChange={(e) => {
            setQ(e.target.value)
            setSelected(null)
          }}
          placeholder="اكتب الاسم أو الكود..."
          className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
          style={{ borderColor: selected ? '#176b52' : '#cde8dc', borderWidth: selected ? 2 : 1 }}
          autoFocus
        />
        {selected && (
          <p className="text-[12px] mt-1.5 font-bold" style={{ color: '#176b52' }}>
            ✓ {selected.name} ({selected.code})
            {selected.amount_due != null && ` · مستحق ${Number(selected.amount_due)} ج`}
          </p>
        )}
        {!selected && (
          <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl border bg-white" style={{ borderColor: '#cde8dc' }}>
            {filtered.length === 0 && (
              <p className="text-center text-[12px] py-3" style={{ color: '#6f7974' }}>
                مفيش نتيجة
              </p>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelected(s)
                  setQ(`${s.name} (${s.code})`)
                }}
                className="w-full text-right px-3 py-2.5 text-[13px] border-b last:border-0 hover:bg-[#e8f7f0]"
                style={{ borderColor: '#e8f5ef' }}
              >
                <span className="font-semibold">{s.name}</span>{' '}
                <span style={{ color: '#6f7974' }}>({s.code})</span>
                {s.amount_due != null && Number(s.amount_due) > 0 && (
                  <span className="mr-2 text-[11px] font-bold" style={{ color: '#ba1a1a' }}>
                    مستحق {Number(s.amount_due)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {selected && (
          <button
            type="button"
            className="text-[11px] mt-1 underline"
            style={{ color: '#6f7974' }}
            onClick={() => {
              setSelected(null)
              setQ('')
            }}
          >
            تغيير الطالب
          </button>
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
        {pending ? 'جاري الحفظ...' : 'حفظ الدفعة'}
      </button>
    </form>
  )
}
