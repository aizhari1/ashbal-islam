import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherDuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()
  if (!teacher) return <div className="p-6">لا يوجد ملف معلم مرتبط</div>
  const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id).eq('status', 'حاضر')
  const sessions = count ?? 0
  const rate = Number(teacher.rate_percent || 50) / 100
  const share = Math.round(sessions * 60 * rate)

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto p-4">
      <Link href="/teacher" className="text-[#0d9b8a] text-[13px]">← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">مستحقاتي</h1>
      <div className="bg-white rounded-2xl p-5 mt-4 shadow-sm space-y-2">
        <p>الحصص المسجّلة: <b>{sessions}</b></p>
        <p>نسبتك: <b>{teacher.rate_percent}%</b></p>
        <p className="text-[20px] font-bold text-[#0d9b8a]">المستحق التقديري: {share.toLocaleString('ar-EG')} ج.م</p>
      </div>
    </div>
  )
}
