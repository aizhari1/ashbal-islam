'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supervisorEditStudent } from './actions'
import { tenureLabel } from '@/lib/student-tenure'

type Teacher = { id: string; name: string }

type Student = {
  id: string
  code: string
  name: string
  phone: string | null
  monthly_sessions: number | null
  session_duration: number | null
  last_session_num: number | null
  amount_due: number | null
  price_per_session: number | null
  teacher_id: string | null
  status: string | null
  join_date?: string | null
  created_at?: string | null
}

const inputCls = 'w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white'
const inputStyle = { borderColor: '#cde8dc' } as const

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function EditStudentForm({
  student,
  teachers,
}: {
  student: Student
  teachers: Teacher[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const { joinAr, tenure, joinDate } = tenureLabel(student)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setMsg(null)
    startTransition(async () => {
      const r = await supervisorEditStudent(fd)
      if (r?.error) {
        setMsg({ type: 'err', text: `فشل الحفظ: ${r.error}` })
      } else {
        const text =
          (r as any)?.message ||
          ((r as any)?.addedSessions > 0
            ? `تم الحفظ · أُضيفت ${(r as any).addedSessions} حصة لسجل المعلم ✓`
            : 'تم حفظ التعديلات بنجاح ✓')
        setMsg({ type: 'ok', text })
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <input type="hidden" name="student_id" value={student.id} />

      <div className="flex justify-between items-center text-[12px]">
        <span className="font-bold" style={{ color: '#00513c' }}>
          {student.code}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: '#e8f7f0', color: '#176b52' }}
        >
          {student.status || '—'}
        </span>
      </div>

      <div
        className="rounded-xl px-3 py-2.5 text-[12px]"
        style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
      >
        <p style={{ color: '#6f7974' }}>مدة الاشتراك (تلقائي · مش محتاج تحسبها كل شهر)</p>
        <p className="font-bold mt-0.5" style={{ color: '#00513c' }}>
          انضم: {joinAr}
        </p>
        <p className="font-bold text-[14px]" style={{ color: '#176b52' }}>
          بقاله: {tenure}
        </p>
      </div>

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

      <Field label="اسم الطالب">
        <input
          name="name"
          defaultValue={student.name || ''}
          className={inputCls}
          style={inputStyle}
          required
        />
      </Field>

      <Field label="رقم الهاتف">
        <input
          name="phone"
          defaultValue={student.phone || ''}
          className={inputCls}
          style={inputStyle}
          dir="ltr"
        />
      </Field>

      <Field label="تاريخ الانضمام">
        <input
          name="join_date"
          type="date"
          defaultValue={joinDate || ''}
          className={inputCls}
          style={inputStyle}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          المدة فوق بتتحدّث لوحدها من التاريخ ده
        </p>
      </Field>

      <Field label="المعلم">
        <select
          name="teacher_id"
          defaultValue={student.teacher_id || ''}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">بدون معلم</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="عدد حلقات الباقة">
          <input
            name="monthly_sessions"
            type="number"
            min={0}
            defaultValue={student.monthly_sessions ?? 8}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="مدة الحلقة (دقيقة)">
          <input
            name="session_duration"
            type="number"
            min={0}
            defaultValue={student.session_duration ?? 30}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="رقم آخر حصة">
        <input
          name="last_session_num"
          type="number"
          min={0}
          defaultValue={student.last_session_num ?? 0}
          className={inputCls}
          style={{ ...inputStyle, borderColor: '#176b52', borderWidth: 2 }}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          لو زوّدت الرقم → الحصص الزيادة تتسجل تلقائي عند المعلم (سجل + إجمالي + راتب) وتقدر تعدّلها من تفاصيل الحصص
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="سعر الحصة (ج)">
          <input
            name="price_per_session"
            type="number"
            min={0}
            step="0.5"
            defaultValue={student.price_per_session ?? 25}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="المستحق الحالي (ج)">
          <input
            name="amount_due"
            type="number"
            min={0}
            defaultValue={student.amount_due ?? 0}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-60"
        style={{ background: '#176b52' }}
      >
        {pending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
      </button>
    </form>
  )
}
