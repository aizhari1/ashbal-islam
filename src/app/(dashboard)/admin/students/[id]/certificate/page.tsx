import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { PrintButton } from './PrintButton'

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: student } = await supabase.from('students').select('*, teachers(name)').eq('id', id).single()
  if (!student) notFound()

  const { count: sessions } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('student_id', id).eq('status', 'حاضر')
  const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3 print:hidden">
        <Link href={`/admin/students/${id}`} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold flex-1">شهادة تقدير</h1>
        <PrintButton />
      </header>
      <div className="px-4 pb-10">
        <div className="bg-white rounded-3xl border-4 border-[#c5a45d] p-6 shadow-sm text-center">
          <p className="text-[12px] text-[#c5a45d] font-bold">أكاديمية أشبال الإسلام</p>
          <h2 className="text-[22px] font-bold text-[#00513c] mt-2">شهادة تقدير</h2>
          <div className="w-16 h-1 bg-[#c5a45d] mx-auto my-3 rounded-full" />
          <p className="text-[13px] text-[#6f7974]">تشهد الأكاديمية بأن الطالب/ة</p>
          <p className="text-[20px] font-bold text-[#111e1a] my-3">{student.name}</p>
          <p className="text-[13px] text-[#3f4944] leading-relaxed">
            قد أتمّ بنجاح حلقات تحفيظ القرآن الكريم
            {sessions ? ` بعدد ${sessions} حلقة مسجّلة` : ''}
            {student.teachers?.name ? ` تحت إشراف ${student.teachers.name}` : ''}
          </p>
          <div className="flex justify-between items-end mt-8 text-[12px] text-[#6f7974]">
            <div>
              <p className="font-bold text-[#111e1a]">ختم الأكاديمية</p>
              <p>{dateStr}</p>
            </div>
            <div className="w-14 h-14 rounded-full border-2 border-[#176b52] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#176b52] text-[28px]">workspace_premium</span>
            </div>
          </div>
          <p className="text-[11px] text-[#6f7974] mt-4">{student.code}</p>
        </div>
      </div>
    </div>
  )
}
