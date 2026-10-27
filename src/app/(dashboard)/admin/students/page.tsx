import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  let query = supabase
    .from('students')
    .select('id, code, name, status, amount_due, currency, teachers(name)')
    .order('code')

  if (params.q) query = query.or(`name.ilike.%${params.q}%,code.ilike.%${params.q}%`)
  if (params.status) query = query.eq('status', params.status)

  const { data: students } = await query.limit(200)

  const statusBadge = (s: string) => {
    if (s === 'نشط') return 'badge-ok'
    if (s === 'موقوف' || s === 'تجريبي') return 'badge-warn'
    return 'badge-err'
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between backdrop-blur-md" style={{ background: 'rgba(238,253,246,0.92)' }}>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <div>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>قسم التوجيه والقبول</p>
            <h1 className="text-[15px] font-bold">إدارة شؤون الطلاب</h1>
          </div>
        </div>
        <Link href="/admin/students/new" className="btn-primary text-[12px] px-3 py-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">person_add</span>
          طالب جديد
        </Link>
      </header>

      <main className="px-4">
        <form className="mb-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[20px]" style={{ color: '#6f7974' }}>search</span>
            <input name="q" defaultValue={params.q || ''} placeholder="بحث بالاسم أو الكود..."
              className="input pr-10" />
          </div>
        </form>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { label: 'الكل', status: '' },
            { label: 'نشط', status: 'نشط' },
            { label: 'موقوف', status: 'موقوف' },
            { label: 'منسحب', status: 'منسحب' },
            { label: 'تجريبي', status: 'تجريبي' },
          ].map((f) => {
            const on = (params.status || '') === f.status
            return (
              <Link key={f.label}
                href={f.status ? `/admin/students?status=${encodeURIComponent(f.status)}` : '/admin/students'}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap"
                style={on
                  ? { background: '#176b52', color: '#fff' }
                  : { background: '#fff', color: '#3f4944', border: '1px solid #e5efe8' }}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        <p className="text-[12px] mb-2 px-1" style={{ color: '#6f7974' }}>
          سجلات المتابعة · {students?.length ?? 0} طالب
        </p>

        <div className="space-y-2">
          {(students ?? []).map((s: any) => (
            <Link key={s.id} href={`/admin/students/${s.id}`} className="card flex items-center gap-3 p-3.5">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px]"
                style={{ background: '#e8f7f0', color: '#176b52' }}>
                {s.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{s.name}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#6f7974' }}>
                  {s.code} · {s.teachers?.name || 'بدون معلم'}
                </p>
              </div>
              <div className="text-left flex flex-col items-end gap-1">
                <span className={statusBadge(s.status)}>{s.status}</span>
                {Number(s.amount_due) > 0 && (
                  <span className="text-[11px] font-bold" style={{ color: '#ba1a1a' }}>{s.amount_due}</span>
                )}
              </div>
            </Link>
          ))}
          {(!students || students.length === 0) && (
            <div className="card p-8 text-center" style={{ color: '#6f7974' }}>لا يوجد طلاب</div>
          )}
        </div>
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
