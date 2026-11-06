'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { updateSessionNum } from './actions'

type StudentRow = {
  id: string
  code: string
  name: string
  last_session_num: number | null
  last_session_date: string | null
  monthly_sessions: number | null
  teachers?: { name: string } | null
}

export function SessionEditor({ students }: { students: StudentRow[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return students
    return students.filter((s) => {
      const name = (s.name || '').toLowerCase()
      const code = (s.code || '').toLowerCase()
      const teacher = (s.teachers?.name || '').toLowerCase()
      return name.includes(term) || code.includes(term) || teacher.includes(term)
    })
  }, [q, students])

  function onSave(e: FormEvent<HTMLFormElement>, studentId: string) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setMsg(null)
    setPendingId(studentId)
    startTransition(async () => {
      const r = await updateSessionNum(fd)
      setPendingId(null)
      if (r?.error) {
        setMsg({ id: studentId, type: 'err', text: r.error })
      } else {
        setMsg({
          id: studentId,
          type: 'ok',
          text: (r as { message?: string })?.message || 'تم الحفظ ✓',
        })
        router.refresh()
      }
    })
  }

  return (
    <div className="px-4 space-y-3">
      <div className="sticky top-0 z-10 pt-1 pb-2" style={{ background: '#eefdf6' }}>
        <p className="text-[12px] font-bold mb-1.5" style={{ color: '#3f4944' }}>
          ابحث عن طالب
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="اكتب الاسم أو الكود أو اسم المعلم..."
          className="w-full rounded-xl border px-3 py-3 text-[14px] bg-white shadow-sm"
          style={{ borderColor: '#176b52' }}
          autoFocus
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          {filtered.length} من {students.length} طالب
        </p>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
          مفيش نتيجة لـ «{q}»
        </p>
      )}

      {filtered.map((s) => (
        <div key={s.id} className="card p-3">
          <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
            {s.name}
          </p>
          <p className="text-[11px] mb-2" style={{ color: '#6f7974' }}>
            {s.code} · {s.teachers?.name || '—'} · باقة {s.monthly_sessions || '—'}
          </p>

          {msg?.id === s.id && (
            <div
              className="rounded-lg px-2 py-1.5 text-[12px] font-bold text-center mb-2"
              style={{
                background: msg.type === 'ok' ? '#e8f7f0' : '#fce8e8',
                color: msg.type === 'ok' ? '#176b52' : '#ba1a1a',
              }}
            >
              {msg.text}
            </div>
          )}

          <form
            onSubmit={(e) => onSave(e, s.id)}
            className="grid grid-cols-3 gap-2 items-end"
          >
            <input type="hidden" name="student_id" value={s.id} />
            <div>
              <label className="text-[10px]" style={{ color: '#6f7974' }}>
                رقم آخر حصة
              </label>
              <input
                name="last_session_num"
                type="number"
                min={0}
                defaultValue={s.last_session_num ?? 0}
                className="w-full rounded-lg border px-2 py-1.5 text-[13px]"
                style={{ borderColor: '#cde8dc' }}
              />
            </div>
            <div>
              <label className="text-[10px]" style={{ color: '#6f7974' }}>
                التاريخ
              </label>
              <input
                name="last_session_date"
                type="date"
                defaultValue={s.last_session_date ? String(s.last_session_date).slice(0, 10) : ''}
                className="w-full rounded-lg border px-2 py-1.5 text-[12px]"
                style={{ borderColor: '#cde8dc' }}
              />
            </div>
            <button
              type="submit"
              disabled={isPending && pendingId === s.id}
              className="rounded-lg py-2 text-[12px] font-bold text-white disabled:opacity-60"
              style={{ background: '#176b52' }}
            >
              {isPending && pendingId === s.id ? '...' : 'حفظ'}
            </button>
          </form>
        </div>
      ))}
    </div>
  )
}
