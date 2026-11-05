import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SessionNumberList from './SessionNumberList'

export const dynamic = 'force-dynamic'

export default async function SessionNumberPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()
  const { data: students } = teacher
    ? await supabase.from('students').select('id, code, name, last_session_num, monthly_sessions').eq('teacher_id', teacher.id).eq('status', 'نشط').order('name')
    : { data: [] as any[] }
  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">تعديل رقم الحصة</h1>
      <p className="text-[12px] mt-1 mb-3" style={{ color: '#6f7974' }}>تقدر تعدّل رقم آخر حصة لطلابك فقط. استخدم +1 أو −1 أو اكتب رقمًا مباشرًا.</p>
      <SessionNumberList students={(students || []) as any} />
    </div>
  )
}
