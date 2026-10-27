import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StudentActions } from './StudentActions'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: student } = await supabase.from('students').select('*, teachers(id, name)').eq('id', id).single()
  if (!student) notFound()

  const { data: teachers } = await supabase.from('teachers').select('id, name').eq('is_active', true).order('name')
  const { data: payments } = await supabase.from('payments').select('*').eq('student_id', id).order('payment_date', { ascending: false }).limit(10)
  const { data: attendance } = await supabase.from('attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }).limit(10)

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#f5f0e8]/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link href="/admin/students" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-bold truncate">{student.name}</h1>
          <p className="text-[12px] text-[#6f7974]">{student.code}</p>
        </div>
        <Link href={`/admin/students/${id}/certificate`} className="text-[#c5a45d]">
          <span className="material-symbols-outlined">workspace_premium</span>
        </Link>
      </header>

      <main className="px-4 pb-28">
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 grid grid-cols-2 gap-2 text-[13px]">
          <div><span className="text-[#6f7974]">الحالة</span><p className="font-bold">{student.status}</p></div>
          <div><span className="text-[#6f7974]">المعلم</span><p className="font-bold">{student.teachers?.name || '—'}</p></div>
          <div><span className="text-[#6f7974]">المستحق</span><p className="font-bold text-[#ba1a1a]">{student.amount_due} {student.currency}</p></div>
          <div><span className="text-[#6f7974]">آخر حلقة</span><p className="font-bold">{student.last_session_date || '—'}</p></div>
          <div><span className="text-[#6f7974]">الهاتف</span><p className="font-bold" dir="ltr">{student.phone || '—'}</p></div>
          <div><span className="text-[#6f7974]">البلد</span><p className="font-bold">{student.country || '—'}</p></div>
        </div>

        <StudentActions studentId={student.id} currentStatus={student.status} currentTeacherId={student.teacher_id} teachers={teachers ?? []} />

        <h2 className="text-[14px] font-bold mt-5 mb-2">المدفوعات</h2>
        <div className="space-y-2 mb-4">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px]">
              <span>{p.payment_date}</span>
              <span className="font-bold text-[#176b52]">{p.amount} {p.currency}</span>
            </div>
          ))}
        </div>

        <h2 className="text-[14px] font-bold mb-2">الحضور</h2>
        <div className="space-y-2">
          {(attendance ?? []).map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-3 text-[13px]">
              <div className="flex justify-between">
                <span>{a.session_date}</span>
                <span className="font-bold">{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

// fix: StudentActions import was already there
