'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import StudentSearchSelect, { type SearchStudent } from '@/components/StudentSearchSelect'
import { Suspense } from 'react'

function TransferInner() {
  const sp = useSearchParams()
  const preId = sp.get('student') || ''

  const [students, setStudents] = useState<SearchStudent[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [selected, setSelected] = useState<SearchStudent | null>(null)
  const [teacherId, setTeacherId] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const sb = createClient()
    sb.from('students')
      .select('id, name, code, status, teacher_id, teachers(name)')
      .order('name')
      .limit(500)
      .then(({ data }) => {
        const list = (data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          status: r.status,
          teacher_name: r.teachers?.name || null,
        }))
        setStudents(list)
        if (preId) {
          const found = list.find((s) => s.id === preId)
          if (found) setSelected(found)
        }
      })
    sb.from('teachers')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setTeachers(data ?? []))
  }, [preId])

  function submit() {
    if (!selected || !teacherId) {
      setMsg('اختر الطالب والمعلم')
      return
    }
    startTransition(async () => {
      const sb = createClient()
      const { error } = await sb.from('students').update({ teacher_id: teacherId }).eq('id', selected.id)
      if (error) setMsg(error.message)
      else setMsg('تم نقل الطالب بنجاح ✓')
    })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/admin" className="text-[13px]" style={{ color: '#176b52' }}>
        ← رجوع
      </Link>
      <h1 className="text-[18px] font-bold mt-2" style={{ color: '#00513c' }}>
        نقل طالب / تغيير معلم
      </h1>
      <div className="card p-4 mt-4 space-y-3">
        <StudentSearchSelect students={students} selectedId={selected?.id} onSelect={setSelected} />
        <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">— المعلم الجديد —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {msg && (
          <p className="text-[13px] font-bold" style={{ color: msg.includes('✓') ? '#176b52' : '#ba1a1a' }}>
            {msg}
          </p>
        )}
        <button type="button" onClick={submit} disabled={isPending || !selected} className="btn-primary w-full py-3">
          {isPending ? 'جاري النقل...' : 'نقل'}
        </button>
      </div>
    </div>
  )
}

export default function TransferPage() {
  return (
    <Suspense fallback={<p className="p-4 text-center">جاري التحميل...</p>}>
      <TransferInner />
    </Suspense>
  )
}
