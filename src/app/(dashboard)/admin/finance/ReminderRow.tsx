'use client'

import { useTransition, useState } from 'react'
import { markReminded, saveContactStatus } from '@/app/actions/reminders'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Student = {
  id: string
  code: string
  name: string
  phone: string | null
  amount_due: number
  sessions: number
  due_date: string
  teacher: string
  reminded_at: string
  contact_status: string
  wa: string
}

const STATUSES = ['لم يتم الاتصال', 'تم الاتصال', 'لا يرد', 'طلب التأجيل', 'اشترك', 'أخرى']

export function ReminderRow({ student: s }: { student: Student }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(s.contact_status)
  const [msg, setMsg] = useState('')

  function onRemind() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('student_id', s.id)
      fd.set('student_name', s.name)
      fd.set('code', s.code)
      await markReminded(fd)
      setMsg('تم تسجيل التذكير')
      if (s.wa) window.open(s.wa, '_blank')
      router.refresh()
    })
  }

  function onSaveStatus() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('student_id', s.id)
      fd.set('student_name', s.name)
      fd.set('code', s.code)
      fd.set('status', status)
      await saveContactStatus(fd)
      setMsg('تم حفظ حالة التواصل')
      router.refresh()
    })
  }

  return (
    <div className="card p-3.5">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="min-w-0">
          <Link href={`/admin/students/${s.id}`} className="font-bold text-[14px] block truncate" style={{ color: '#111e1a' }}>
            {s.name}
          </Link>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {s.teacher} · {s.code}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-[16px] font-bold" style={{ color: '#ba1a1a' }}>{s.amount_due.toLocaleString('ar-EG')}</p>
          <p className="text-[10px]" style={{ color: '#6f7974' }}>{s.sessions} حصة</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3" style={{ color: '#6f7974' }}>
        <div>
          <span>تاريخ الاستحقاق: </span>
          <b style={{ color: '#3f4944' }}>{s.due_date || '—'}</b>
        </div>
        <div>
          <span>آخر تذكير: </span>
          <b style={{ color: '#3f4944' }}>{s.reminded_at || '—'}</b>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {s.wa ? (
          <a
            href={s.wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: '#e8f7f0', color: '#176b52' }}
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            واتساب
          </a>
        ) : (
          <span className="text-[11px]" style={{ color: '#6f7974' }}>لا يوجد رقم</span>
        )}

        <button
          type="button"
          onClick={onRemind}
          disabled={isPending}
          className="px-4 py-1.5 rounded-full text-[13px] font-bold border-2"
          style={{ borderColor: '#c74747', color: '#c74747', background: '#fff' }}
        >
          ذكّر
        </button>
      </div>

      <div className="flex gap-2 mt-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input text-[12px] flex-1 py-2"
        >
          {STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <button type="button" onClick={onSaveStatus} disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">
          حفظ
        </button>
      </div>
      {msg && <p className="text-[11px] mt-2" style={{ color: '#176b52' }}>{msg}</p>}
    </div>
  )
}
