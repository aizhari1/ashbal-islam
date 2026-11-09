import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { StudentActions } from './StudentActions'
import { tenureLabel } from '@/lib/student-tenure'

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: student } = await supabase.from('students').select('*, teachers(id, name)').eq('id', id).single()
  if (!student) notFound()

  const { data: teachers } = await supabase.from('teachers').select('id, name').eq('is_active', true).order('name')
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', id)
    .order('payment_date', { ascending: false })
    .limit(10)
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', id)
    .order('session_date', { ascending: false })
    .limit(10)

  const { joinAr, tenure } = tenureLabel(student)

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
        <div className="bg-[#e8f7f0] rounded-2xl p-3.5 mb-3 border border-[#cde8dc]">
          <p className="text-[11px] font-bold mb-1" style={{ color: '#176b52' }}>
            مدة الاشتراك (تلقائي)
          </p>
          <div className="flex justify-between items-end gap-2">
            <div>
              <p className="text-[12px]" style={{ color: '#6f7974' }}>
                تاريخ الانضمام
              </p>
              <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>
                {joinAr}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[12px]" style={{ color: '#6f7974' }}>
                بقاله
              </p>
              <p className="text-[16px] font-bold" style={{ color: '#176b52' }}>
                {tenure}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm mb-3 space-y-1.5 text-[13px]">
          <p>
            <b>الحالة:</b> {student.status}
          </p>
          <p>
            <b>المعلم:</b> {(student as any).teachers?.name || '—'}
          </p>
          <p>
            <b>الهاتف:</b> {student.phone || '—'}
          </p>
          <p>
            <b>الباقة:</b> {student.monthly_sessions || '—'} حصة · {student.price_per_session || '—'} ج
          </p>
          <p>
            <b>آخر حصة:</b> {student.last_session_num ?? '—'}
          </p>
          <p>
            <b>المستحق:</b>{' '}
            <span style={{ color: Number(student.amount_due) > 0 ? '#ba1a1a' : '#176b52' }}>
              {Number(student.amount_due || 0).toLocaleString('ar-EG')} ج
            </span>
          </p>
        </div>

        <StudentActions
          studentId={student.id}
          studentName={student.name}
          currentStatus={student.status}
          currentTeacherId={student.teacher_id}
          teachers={teachers ?? []}
        />

        <h2 className="text-[14px] font-bold mt-5 mb-2">المدفوعات</h2>
        <div className="space-y-2 mb-4">
          {(payments ?? []).map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px]">
              <span>{p.payment_date}</span>
              <b>{Number(p.amount).toLocaleString('ar-EG')}</b>
            </div>
          ))}
          {(!payments || payments.length === 0) && (
            <p className="text-[12px] text-center" style={{ color: '#6f7974' }}>
              لا مدفوعات
            </p>
          )}
        </div>

        <h2 className="text-[14px] font-bold mb-2">آخر الحضور</h2>
        <div className="space-y-2">
          {(attendance ?? []).map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-3 flex justify-between text-[13px]">
              <span>
                {a.session_date}
                {a.session_num != null ? ` · حصة ${a.session_num}` : ''}
              </span>
              <span>{a.status}</span>
            </div>
          ))}
          {(!attendance || attendance.length === 0) && (
            <p className="text-[12px] text-center" style={{ color: '#6f7974' }}>
              لا حضور
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
