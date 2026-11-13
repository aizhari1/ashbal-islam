'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import StudentSearchSelect, { type SearchStudent } from '@/components/StudentSearchSelect'
import { changeStudentStatus } from './actions'

export default function StatusForm({ students }: { students: SearchStudent[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<SearchStudent | null>(null)
  const [status, setStatus] = useState('نشط')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  function submit() {
    if (!selected?.id) {
      setMsg('اختَر الطالب من البحث أولاً')
      return
    }
    setMsg('')
    start(async () => {
      const fd = new FormData()
      fd.set('student_id', selected.id)
      fd.set('status', status)
      if (note.trim()) fd.set('note', note.trim())
      const r: any = await changeStudentStatus(fd)
      if (r?.error) {
        setMsg(r.error)
        return
      }
      setMsg('تم حفظ الحالة ✓')
      setSelected((s) => (s ? { ...s, status } : s))
      setNote('')
      router.refresh()
    })
  }

  return (
    <div className="card p-4 space-y-3">
      <StudentSearchSelect
        students={students}
        selectedId={selected?.id || null}
        onSelect={(s) => {
          setSelected(s)
          if (s?.status) setStatus(s.status)
          setMsg('')
        }}
        label="ابحث عن الطالب"
        placeholder="اسم أو كود الطالب..."
        maxResults={50}
      />

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          الحالة الجديدة
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
          style={{ borderColor: '#cde8dc' }}
        >
          <option value="نشط">نشط</option>
          <option value="موقوف">موقوف مؤقتًا</option>
          <option value="منسحب">منسحب</option>
          <option value="تجريبي">تجريبي</option>
        </select>
      </div>

      <div>
        <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
          ملاحظة (اختياري)
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ملاحظة / تاريخ العودة المتوقع"
          className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
          style={{ borderColor: '#cde8dc' }}
        />
      </div>

      <button
        type="button"
        disabled={pending || !selected}
        onClick={submit}
        className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-50"
        style={{ background: '#176b52' }}
      >
        {pending ? 'جاري الحفظ...' : 'حفظ الحالة'}
      </button>

      {msg && (
        <p
          className="text-center text-[13px] font-bold"
          style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}
        >
          {msg}
        </p>
      )}
    </div>
  )
}
