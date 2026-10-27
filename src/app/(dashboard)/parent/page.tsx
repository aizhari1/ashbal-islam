import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ParentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: children } = await supabase
    .from('students')
    .select('id, code, name, status, amount_due, teachers(name)')
    .eq('parent_id', user.id)

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3">
        <p className="text-[12px] text-[#6f7974]">بوابة ولي الأمر</p>
        <h1 className="text-[18px] font-bold text-[#00513c]">أكاديمية أشبال الإسلام</h1>
        <p className="text-[13px] text-[#6f7974]">{profile?.full_name}</p>
      </header>
      <main className="px-4 pb-24">
        <h2 className="text-[14px] font-bold mb-3">أبنائي</h2>
        <div className="space-y-2">
          {(children ?? []).map((c: { id: string; name: string; code: string; status: string; amount_due: number; teachers: { name: string } | null }) => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-bold text-[15px]">{c.name}</p>
              <p className="text-[12px] text-[#6f7974]">{c.code} · {c.teachers?.name || '—'} · {c.status}</p>
              {c.amount_due > 0 && <p className="text-[12px] text-[#ba1a1a] mt-1">مستحق: {c.amount_due} ج.م</p>}
            </div>
          ))}
          {(!children || children.length === 0) && (
            <div className="bg-white rounded-2xl p-6 text-center text-[#6f7974]">لا يوجد أبناء مرتبطون بهذا الحساب بعد</div>
          )}
        </div>
        <Link href="/parent/evaluate" className="mt-4 block w-full bg-[#176b52] text-white text-center py-3.5 rounded-2xl font-bold">
          التقييم الشهري
        </Link>
      </main>
    </div>
  )
}
