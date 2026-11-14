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
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!selected?.id) {
      setMsg({ type: 'err', text: 'اختَر الطالب من البحث أولاً' })
      return
    }
    setMsg(null)
    start(async () => {
      const fd = new FormData()
      fd.set('student_id', selected.id)
      fd.set('status', status)
      if (note.trim()) fd.set('note', note.trim())
      try {
        const r: any = await changeStudentStatus(fd)
        if (r?.error) {
          setMsg({ type: 'err', text: r.error })
          return
        }
        const text =
          r?.message ||
          `تم تغيير حالة «${selected.name}» إلى «${status}»`
        setMsg({ type: 'ok', text })
        setSelected((s) => (s ? { ...s, status } : s))
        setNote('')
        router.refresh()
      } catch (e: any) {
        setMsg({ type: 'err', text: e?.message || 'فشل الحفظ — حاول مرة أخرى' })
      }
    })
  }

  return (
    <div className="card p-4 space-y-3">
      {msg && (
        <div
          className="rounded-xl px-3 py-3 text-[13px] font-bold text-center"
          style={{
            background: msg.type === 'ok' ? '#e8f7f0' : '#ffdad6',
            color: msg.type === 'ok' ? '#176b52' : '#93000a',
            border: `1px solid ${msg.type === 'ok' ? '#b6e3cf' : '#ffb4ab'}`,
          }}
          role="status"
        >
          {msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}
        </div>
      )}

      <StudentSearchSelect
        students={students}
        selectedId={selected?.id || null}
        onSelect={(s) => {
          setSelected(s)
          if (s?.status) setStatus(s.status)
          setMsg(null)
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
    </div>
  )
}
