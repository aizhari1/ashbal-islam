import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UsersClient } from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, code, full_name, role, email, is_active')
    .order('role')
    .order('full_name')

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">إدارة المستخدمين</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>إضافة / تعطيل / تغيير دور</p>
        </div>
      </header>
      <UsersClient profiles={profiles ?? []} />
    </div>
  )
}
