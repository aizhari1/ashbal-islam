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
    .select('id, code, name, status, amount_due, currency, last_session_date, teachers(name)')
    .order('code')

  if (params.q) {
    query = query.or(`name.ilike.%${params.q}%,code.ilike.%${params.q}%`)
  }
  if (params.status) {
    query = query.eq('status', params.status)
  }

  const { data: students } = await query.limit(200)

  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#f5f0e8]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <h1 className="text-[16px] font-bold">الطلاب ({students?.length ?? 0})</h1>
        </div>
        <Link href="/admin/students/new" className="bg-[#176b52] text-white text-[12px] font-bold px-3 py-2 rounded-full">
          + إضافة
        </Link>
      </header>

      <main className="px-4 pb-24">
        <form className="mb-3">
          <input
            name="q"
            defaultValue={params.q || ''}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-2.5 text-[14px]"
          />
        </form>

        <div className="flex gap-2 mb-3 overflow-x-auto">
          {[
            { label: 'الكل', status: '' },
            { label: 'نشط', status: 'نشط' },
            { label: 'موقوف', status: 'موقوف' },
            { label: 'منسحب', status: 'منسحب' },
            { label: 'تجريبي', status: 'تجريبي' },
          ].map((f) => (
            <Link
              key={f.label}
              href={f.status ? `/admin/students?status=${encodeURIComponent(f.status)}` : '/admin/students'}
              className={`px-3 py-1 rounded-full text-[12px] whitespace-nowrap ${
                (params.status || '') === f.status
                  ? 'bg-[#176b52] text-white'
                  : 'bg-white text-[#3f4944] border border-[#e5efe8]'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="space-y-2">
          {(students ?? []).map((s: any) => (
            <Link
              key={s.id}
              href={`/admin/students/${s.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-[#e8f7f0] flex items-center justify-center text-[#176b52] font-bold">
                {s.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{s.name}</p>
                <p className="text-[11px] text-[#6f7974]">
                  {s.code} · {s.teachers?.name || 'بدون معلم'} · {s.status}
                </p>
              </div>
              {Number(s.amount_due) > 0 && (
                <span className="text-[12px] font-bold text-[#ba1a1a]">{s.amount_due}</span>
              )}
            </Link>
          ))}
          {(!students || students.length === 0) && (
            <div className="bg-white rounded-2xl p-6 text-center text-[#6f7974]">لا يوجد طلاب</div>
          )}
        </div>
      </main>
    </div>
  )
}
