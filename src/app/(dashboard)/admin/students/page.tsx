import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { tenureLabel } from '@/lib/student-tenure'
import { StudentsLiveSearch } from '@/components/StudentsLiveSearch'

export const dynamic = 'force-dynamic'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  let query = supabase
    .from('students')
    .select('id, code, name, status, amount_due, currency, join_date, created_at, phone, teachers(name)')
    .order('name')

  if (params.status) query = query.eq('status', params.status)

  const { data: students } = await query.limit(800)

  const list = (students ?? []).map((s: any) => {
    const { tenure } = tenureLabel(s)
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      status: s.status,
      amount_due: s.amount_due,
      join_date: s.join_date,
      created_at: s.created_at,
      phone: s.phone,
      teachers: s.teachers,
      tenure,
    }
  })

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header
        className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between backdrop-blur-md"
        style={{ background: 'rgba(238,253,246,0.92)' }}
      >
        <div className="flex items-center gap-2">
          <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              قسم التوجيه والقبول
            </p>
            <h1 className="text-[15px] font-bold">إدارة شؤون الطلاب</h1>
          </div>
        </div>
        <Link href="/admin/students/new" className="btn-primary text-[12px] px-3 py-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          طالب جديد
        </Link>
      </header>

      <main className="px-4">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {[
            { label: 'الكل', status: '' },
            { label: 'نشط', status: 'نشط' },
            { label: 'موقوف', status: 'موقوف' },
            { label: 'منسحب', status: 'منسحب' },
            { label: 'تجريبي', status: 'تجريبي' },
          ].map((f) => {
            const on = (params.status || '') === f.status
            return (
              <Link
                key={f.label}
                href={f.status ? `/admin/students?status=${encodeURIComponent(f.status)}` : '/admin/students'}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                style={
                  on
                    ? { background: '#176b52', color: '#fff' }
                    : { background: '#fff', color: '#3f4944', border: '1px solid #e5efe8' }
                }
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        <StudentsLiveSearch students={list} hrefPrefix="/admin/students" />
      </main>

      <nav className="bottom-nav">
        {[
          { href: '/admin', icon: 'home', label: 'الرئيسية' },
          { href: '/admin/students/new', icon: 'person_add', label: 'إضافة' },
          { href: '/admin/finance', icon: 'receipt_long', label: 'الرسوم' },
          { href: '/admin/cashbox', icon: 'account_balance', label: 'الصندوق' },
          { href: '/admin/students', icon: 'groups', label: 'الطلاب', active: true },
        ].map((n: any) => (
          <Link key={n.label} href={n.href} className={n.active ? 'active' : ''}>
            <span className="material-symbols-outlined text-[22px]">{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
