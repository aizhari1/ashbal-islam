'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordAttendance } from '@/app/actions/attendance'
import Link from 'next/link'

type Student = { id: string; code: string; name: string; status: string; last_session_num: number | null }
const STATUSES = ['حاضر', 'غائب', 'متأخر', 'معذور']

export default function TeacherSessionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [status, setStatus] = useState('حاضر')
  const [hifzFrom, setHifzFrom] = useState('')
  const [hifzTo, setHifzTo] = useState('')
  const [murajaFrom, setMurajaFrom] = useState('')
  const [murajaTo, setMurajaTo] = useState('')
  const [tajweed, setTajweed] = useState('')
  const [rating, setRating] = useState(5)
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
      if (teacher) {
        setTeacherId(teacher.id)
        const { data } = await supabase.from('students').select('id, code, name, status, last_session_num').eq('teacher_id', teacher.id).eq('status', 'نشط').order('name')
        setStudents(data ?? [])
      } else {
        const { data } = await supabase.from('students').select('id, code, name, status, last_session_num').eq('status', 'نشط').order('name').limit(50)
        setStudents(data ?? [])
      }
    })()
  }, [])

  const current = students.find((s) => s.id === selected)

  function save() {
    if (!selected) return
    setMsg('')
    startTransition(async () => {
      const res = await recordAttendance({
        student_id: selected,
        teacher_id: teacherId,
        status,
        hifz_from: hifzFrom,
        hifz_to: hifzTo,
        muraja_from: murajaFrom,
        muraja_to: murajaTo,
        tajweed_notes: tajweed,
        rating,
        notes,
        session_num: (current?.last_session_num || 0) + 1,
      })
      if (res.error) setMsg(res.error)
      else {
        setMsg('تم حفظ الحلقة ✓')
        setHifzFrom(''); setHifzTo(''); setMurajaFrom(''); setMurajaTo(''); setTajweed(''); setNotes('')
      }
    })
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#176b52] text-white px-4 py-3 flex items-center justify-between">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="text-center">
          <p className="text-[14px] font-bold">غرفة التسميع</p>
          <p className="text-[11px] text-white/70">حضور + حفظ/مراجعة + تجويد</p>
        </div>
        <span className="w-9" />
      </header>

      <main className="px-4 pb-28">
        <div className="mt-3 mb-3">
          <label className="text-[13px] font-medium">اختر الطالب</label>
          <select value={selected || ''} onChange={(e) => setSelected(e.target.value || null)}
            className="w-full mt-1 bg-white border border-[#e5efe8] rounded-xl px-3 py-3 text-[14px]">
            <option value="">— طالب —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
        </div>

        {selected && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {STATUSES.map((st) => (
                <button key={st} type="button" onClick={() => setStatus(st)}
                  className={`px-3 py-1.5 rounded-full text-[13px] font-semibold ${status === st ? 'bg-[#176b52] text-white' : 'bg-white text-[#3f4944]'}`}>
                  {st}
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3 mb-3">
              <p className="text-[13px] font-bold text-[#176b52]">الحفظ الجديد</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={hifzFrom} onChange={(e) => setHifzFrom(e.target.value)} placeholder="من" className="bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
                <input value={hifzTo} onChange={(e) => setHifzTo(e.target.value)} placeholder="إلى" className="bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
              </div>
              <p className="text-[13px] font-bold text-[#176b52]">المراجعة</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={murajaFrom} onChange={(e) => setMurajaFrom(e.target.value)} placeholder="من" className="bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
                <input value={murajaTo} onChange={(e) => setMurajaTo(e.target.value)} placeholder="إلى" className="bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
              </div>
              <p className="text-[13px] font-bold text-[#176b52]">رصد التجويد</p>
              <textarea value={tajweed} onChange={(e) => setTajweed(e.target.value)} rows={2} placeholder="ملاحظات المخارج" className="w-full bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
              <div>
                <p className="text-[13px] font-medium mb-1">التقييم ({rating}/5)</p>
                <input type="range" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
              </div>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="w-full bg-[#eefdf6] rounded-xl px-3 py-2.5 text-[14px] border border-[#e5efe8]" />
            </div>
            {msg && <p className={`text-[13px] mb-2 font-medium ${msg.includes('✓') ? 'text-[#176b52]' : 'text-[#ba1a1a]'}`}>{msg}</p>}
            <button onClick={save} disabled={isPending} className="w-full bg-[#176b52] text-white py-3.5 rounded-2xl font-bold disabled:opacity-50">
              {isPending ? 'جاري الحفظ...' : 'حفظ الحلقة'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
