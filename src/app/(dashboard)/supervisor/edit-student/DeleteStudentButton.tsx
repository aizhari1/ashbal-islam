'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteStudentCompletely } from '@/app/actions/delete-student'

export function DeleteStudentButton({
  studentId,
  studentName,
}: {
  studentId: string
  studentName: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  function onDelete() {
    if (
      !confirm(
        `حذف نهائي لـ «${studentName}»؟\n\nهيتشال من السيستم كله (حضور · دفعات · مواعيد).\nمش هيرجع.`
      )
    )
      return
    const typed = prompt(`للتأكيد اكتب الاسم بالظبط:\n${studentName}`)
    if (typed == null) return
    if (typed.trim() !== studentName.trim()) {
      setMsg('الاسم مش مطابق — اتلغى الحذف')
      return
    }
    setMsg('')
    start(async () => {
      const r = await deleteStudentCompletely(studentId)
      if (r.error) {
        setMsg(r.error)
        return
      }
      setMsg(r.message || 'تم الحذف')
      router.push('/supervisor/edit-student')
      router.refresh()
    })
  }

  return (
    <div className="mt-4 rounded-2xl p-4" style={{ background: '#fce8e8', border: '1px solid #f5c2c0' }}>
      <p className="text-[13px] font-bold mb-1" style={{ color: '#93000a' }}>
        حذف نهائي من النظام
      </p>
      <p className="text-[11px] mb-3" style={{ color: '#6f7974' }}>
        يمسح الطالب وكل بياناته المرتبطة. العملية مش بتتراجع.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="w-full py-3 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
        style={{ background: '#ba1a1a' }}
      >
        {pending ? 'جاري الحذف...' : 'حذف الطالب نهائيًا'}
      </button>
      {msg && (
        <p className="text-[12px] text-center mt-2 font-semibold" style={{ color: '#ba1a1a' }}>
          {msg}
        </p>
      )}
    </div>
  )
}
