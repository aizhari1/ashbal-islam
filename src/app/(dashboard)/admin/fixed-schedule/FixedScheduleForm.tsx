'use client'

import { useTransition, useState } from 'react'
import { addFixedSchedule } from '@/app/actions/schedule'
import { useRouter } from 'next/navigation'

const DAYS = [
  { v: 0, l: 'الأحد' }, { v: 1, l: 'الإثنين' }, { v: 2, l: 'الثلاثاء' },
  { v: 3, l: 'الأربعاء' }, { v: 4, l: 'الخميس' }, { v: 5, l: 'الجمعة' }, { v: 6, l: 'السبت' },
]

export function FixedScheduleForm({ students, teachers }: { students: any[]; teachers: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  function submit(formData: FormData) {
    startTransition(async () => {
      const r = await addFixedSchedule(formData)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم إضافة الموعد')
        router.refresh()
      }
    })
  }

  return (
    <form action={submit} className="space-y-2">
      <select name="student_id" className="input" required>
        <option value="">— الطالب —</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
      </select>
      <select name="teacher_id" className="input" required>
        <option value="">— المعلم —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select name="day_of_week" className="input" required defaultValue={1}>
          {DAYS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
        </select>
        <input name="start_time" type="time" className="input" required />
      </div>
      <input name="duration_minutes" type="number" defaultValue={30} className="input" placeholder="المدة بالدقائق" />
      <input name="zoom_link" className="input" placeholder="رابط Zoom / Meet" dir="ltr" />
      <input name="notes" className="input" placeholder="ملاحظات" />
      {msg && <p className="text-[12px]" style={{ color: '#176b52' }}>{msg}</p>}
      <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">حفظ الموعد</button>
    </form>
  )
}
