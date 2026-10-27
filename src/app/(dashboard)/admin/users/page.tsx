import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('code, full_name, role, email, is_active')
    .order('role')

  const roleLabel: Record<string, string> = {
    admin: 'مدير', supervisor: 'مشرف', teacher: 'معلم', parent: 'ولي أمر', student: 'طالب',
  }

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="text-[#0d9b8a]">←</Link>
        <h1 className="text-[16px] font-bold">إدارة المستخدمين</h1>
      </header>
      <main className="px-3 pb-24">
        <p className="text-[12px] text-[#6f7974] mb-3 px-1">مستوردون من شيت تسجيل الدخول</p>
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y">
          {(profiles ?? []).map((p, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <div>
                <p className="font-bold">{p.full_name}</p>
                <p className="text-[11px] text-[#6f7974]">{p.code} · {roleLabel[p.role] || p.role}</p>
              </div>
              <span className="text-[11px] text-[#0d9b8a]">{p.is_active ? 'نشط' : 'موقوف'}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
