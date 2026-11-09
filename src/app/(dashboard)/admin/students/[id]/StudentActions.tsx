'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStudentStatus, transferStudent } from '@/app/actions/students'
import { deleteStudentCompletely } from '@/app/actions/delete-student'

const STATUSES = ['نشط', 'موقوف', 'منسحب', 'تجريبي', 'مؤجل']

export function StudentActions({
  studentId,
  studentName,
  currentStatus,
  currentTeacherId,
  teachers,
}: {
  studentId: string
  studentName?: string
  currentStatus: string
  currentTeacherId: string | null
  teachers: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [teacherId, setTeacherId] = useState(currentTeacherId || '')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  function changeStatus() {
    setMsg('')
    startTransition(async () => {
      const res = await updateStudentStatus(studentId, status)
      setMsg(res.error || 'تم تحديث الحالة')
      if (!res.error) router.refresh()
    })
  }

  function doTransfer() {
    setMsg('')
    startTransition(async () => {
      const res = await transferStudent(studentId, teacherId)
      setMsg(res.error || 'تم نقل الطالب')
      if (!res.error) router.refresh()
    })
  }

  function doDelete() {
    const name = studentName || 'هذا الطالب'
    if (
      !confirm(
        `حذف نهائي لـ «${name}»؟\n\nهيتشال من السيستم كله: الحضور · الدفعات · المواعيد · السجل.\nالعملية مش هترجع.`
      )
    )
      return
    const typed = prompt(`للتأكيد اكتب اسم الطالب بالظبط:\n${name}`)
    if (typed == null) return
    if (typed.trim() !== name.trim()) {
      setMsg('الاسم مش مطابق — اتلغى الحذف')
      return
    }
    setMsg('')
    startTransition(async () => {
      const res = await deleteStudentCompletely(studentId)
      if (res.error) {
        setMsg(res.error)
        return
      }
      setMsg(res.message || 'تم الحذف')
      router.push('/admin/students')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-[13px] font-bold">تغيير الحالة</p>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={changeStatus}
          disabled={isPending}
          className="w-full bg-[#176b52] text-white py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50"
        >
          حفظ الحالة
        </button>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
        <p className="text-[13px] font-bold">نقل لمعلم آخر</p>
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-3 py-2.5 text-[14px]"
        >
          <option value="">— بدون معلم —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={doTransfer}
          disabled={isPending}
          className="w-full bg-[#e8f7f0] text-[#176b52] py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50"
        >
          تنفيذ النقل
        </button>
      </div>

      <div className="rounded-2xl p-4 space-y-2" style={{ background: '#fce8e8', border: '1px solid #f5c2c0' }}>
        <p className="text-[13px] font-bold" style={{ color: '#93000a' }}>
          حذف نهائي من النظام
        </p>
        <p className="text-[11px] leading-snug" style={{ color: '#6f7974' }}>
          يمسح الطالب وكل حضوره ودفعاته ومواعيده. مش بيتراجع.
        </p>
        <button
          type="button"
          onClick={doDelete}
          disabled={isPending}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: '#ba1a1a' }}
        >
          {isPending ? 'جاري الحذف...' : 'حذف الطالب نهائيًا'}
        </button>
      </div>

      {msg && (
        <p
          className="text-[13px] text-center font-medium"
          style={{ color: msg.includes('فشل') || msg.includes('مش') || msg.includes('غير') ? '#ba1a1a' : '#176b52' }}
        >
          {msg}
        </p>
      )}
    </div>
  )
}
