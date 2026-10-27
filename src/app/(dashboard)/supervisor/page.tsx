import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function SupervisorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { count: students } = await supabase.from('students').select('*', { count: 'exact', head: true })
  const { count: teachers } = await supabase.from('teachers').select('*', { count: 'exact', head: true })
  const { count: active } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'نشط')

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3">
        <p className="text-[12px] text-[#6f7974]">لوحة المشرف</p>
        <h1 className="text-[18px] font-bold text-[#00513c]">{profile?.full_name || 'مشرف'}</h1>
      </header>
      <main className="px-4 pb-24">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold">{students ?? 0}</p>
            <p className="text-[11px] text-[#6f7974]">طلاب</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold text-[#176b52]">{active ?? 0}</p>
            <p className="text-[11px] text-[#6f7974]">نشط</p>
          </div>
          <div className="bg-white rounded-2xl p-3 text-center shadow-sm">
            <p className="text-[20px] font-bold">{teachers ?? 0}</p>
            <p className="text-[11px] text-[#6f7974]">معلمون</p>
          </div>
        </div>
        <div className="space-y-2">
          <Link href="/admin/students" className="block bg-white rounded-2xl p-4 shadow-sm font-semibold">متابعة الطلاب</Link>
          <Link href="/admin/schedule" className="block bg-white rounded-2xl p-4 shadow-sm font-semibold">الجدول والإشراف</Link>
          <Link href="/admin/finance" className="block bg-white rounded-2xl p-4 shadow-sm font-semibold">المستحقات</Link>
        </div>
      </main>
    </div>
  )
}
