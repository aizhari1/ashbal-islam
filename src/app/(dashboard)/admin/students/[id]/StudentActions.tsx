'use client'

import { useState, useTransition } from 'react'
import { updateStudentStatus, transferStudent } from '@/app/actions/students'

const STATUSES = ['نشط', 'موقوف', 'منسحب', 'تجريبي', 'مؤجل']

export function StudentActions({
  studentId,
  currentStatus,
  currentTeacherId,
  teachers,
}: {
  studentId: string
  currentStatus: string
  currentTeacherId: string | null
  teachers: { id: string; name: string }[]
}) {
  const [status, setStatus] = useState(currentStatus)
  const [teacherId, setTeacherId] = useState(currentTeacherId || '')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function changeStatus() {
    setMsg('')
    startTransition(async () => {
      const res = await updateStudentStatus(studentId, status)
      setMsg(res.error || 'تم تحديث الحالة')
    })
  }

  function doTransfer() {
    setMsg('')
    startTransition(async () => {
      const res = await transferStudent(studentId, teacherId)
      setMsg(res.error || 'تم نقل الطالب')
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-[13px] font-bold">تغيير الحالة</p>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={changeStatus} disabled={isPending}
          className="w-full bg-[#176b52] text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50">
          حفظ الحالة
        </button>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-[13px] font-bold">نقل لمعلم آخر</p>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
          className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]">
          <option value="">— بدون معلم —</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={doTransfer} disabled={isPending}
          className="w-full bg-[#e8f7f0] text-[#176b52] py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50">
          تنفيذ النقل
        </button>
      </div>
      {msg && <p className="text-[13px] text-center font-medium text-[#176b52]">{msg}</p>}
    </div>
  )
}
