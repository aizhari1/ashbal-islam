import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { UsersClient } from './UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profiles }, { data: teachers }, { data: studentRows }] = await Promise.all([
    supabase.from('profiles').select('id, code, full_name, role, email, is_active').order('role').order('full_name'),
    supabase.from('teachers').select('id, code, name, profile_id, is_active').order('name'),
    supabase.from('students').select('teacher_id').not('teacher_id', 'is', null),
  ])

  const countByTeacher: Record<string, number> = {}
  for (const s of studentRows ?? []) {
    const tid = (s as any).teacher_id
    if (tid) countByTeacher[tid] = (countByTeacher[tid] || 0) + 1
  }

  const teachersWithCount = (teachers ?? []).map((t) => ({
    ...t,
    student_count: countByTeacher[t.id] || 0,
  }))

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">إدارة المستخدمين</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            إضافة · ربط · إيقاف/حذف مع نقل الطلاب
          </p>
        </div>
      </header>
      <UsersClient profiles={profiles ?? []} teachers={teachersWithCount} />
    </div>
  )
}
