'use client'

import { formatTime12 } from '@/lib/time-format'
import { useState, useTransition } from 'react'
import { deleteFixedSchedule, updateFixedSchedule } from '@/app/actions/schedule'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const zoomOf = (n: string | null) => (n ? (n.match(/ZOOM=(\S+)/) || [])[1] || null : null)
const plain = (n: string | null) => (n ? n.replace(/\s*\|?\s*ZOOM=\S+/, '').trim() : '')

export function ScheduleRow({
  e,
  teachers,
}: {
  e: any
  teachers: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')
  const zoom = zoomOf(e.notes)

  function run(fn: () => Promise<any>) {
    setMsg('')
    start(async () => {
      const r = await fn()
      if (r?.error) setMsg(r.error)
      else setEditing(false)
    })
  }

  return (
    <div className="card p-3.5 text-[13px]">
      <div className="flex justify-between">
        <p className="font-bold">
          {DAYS[e.day_of_week] ?? e.day_of_week} · {formatTime12(e.start_time)}
        </p>
        <span className="badge-ok">{e.status}</span>
      </div>
      <p className="mt-1">
        {e.students?.name || 'بدون طالب'} · {e.teachers?.name || 'بدون معلم'}
      </p>
      <p className="text-[11px]" style={{ color: '#6f7974' }}>
        {e.duration_minutes || 30} دقيقة{plain(e.notes) ? ` · ${plain(e.notes)}` : ''}
      </p>
      {zoom && (
        <a href={zoom} target="_blank" rel="noreferrer" className="text-[12px] font-semibold block mt-1" style={{ color: '#176b52' }} dir="ltr">
          رابط الحلقة ↗
        </a>
      )}

      <div className="flex gap-4 mt-2 text-[12px] font-bold">
        <button type="button" style={{ color: '#755b1b' }} onClick={() => setEditing(!editing)}>
          {editing ? 'إلغاء' : 'تعديل'}
        </button>
        <button
          type="button"
          disabled={pending}
          style={{ color: '#93000a' }}
          onClick={() => {
            if (!confirm('حذف الموعد؟')) return
            const fd = new FormData()
            fd.set('id', e.id)
            run(() => deleteFixedSchedule(fd))
          }}
        >
          حذف
        </button>
      </div>

      {editing && (
        <form
          className="mt-2 space-y-2"
          action={(fd) => {
            fd.set('id', e.id)
            run(() => updateFixedSchedule(fd))
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <select name="day_of_week" className="input" defaultValue={e.day_of_week}>
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
            <input name="start_time" type="time" className="input" defaultValue={(e.start_time || '').slice(0, 5)} />
          </div>
          <select name="teacher_id" className="input" defaultValue={e.teacher_id || ''}>
            <option value="">— المعلم —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input name="duration_minutes" type="number" className="input" defaultValue={e.duration_minutes || 30} placeholder="المدة بالدقائق" />
          <input name="zoom_link" className="input" dir="ltr" defaultValue={zoom || ''} placeholder="رابط Zoom / Meet" />
          <input name="notes" className="input" defaultValue={plain(e.notes)} placeholder="ملاحظات" />
          <button disabled={pending} className="btn-primary w-full py-2">
            {pending ? '...' : 'حفظ التعديل'}
          </button>
        </form>
      )}
      {msg && (
        <p className="text-[11px] mt-1" style={{ color: '#93000a' }}>
          {msg}
        </p>
      )}
    </div>
  )
}

export default ScheduleRow
