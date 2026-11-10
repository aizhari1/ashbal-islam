import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/courses'
import PackageEditor from './PackageEditor'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!(await requireAdmin()).ok) redirect('/login')

  const { data: packages } = await supabase.from('packages').select('*').eq('is_active', true).order('sessions_count')

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">باقات الاشتراك</h1>
      </header>
      <main className="px-4 pb-24 space-y-3">
        {(packages ?? []).map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[15px] font-bold">{p.name}</h3>
                <p className="text-[12px] text-[#6f7974] mt-0.5">{p.description || `${p.sessions_count} حصة`}</p>
              </div>
              <p className="text-[18px] font-bold text-[#176b52]">{Number(p.price).toLocaleString('en-US')}</p>
            </div>
            <PackageEditor
              pkg={{
                id: p.id,
                name: p.name,
                sessions_count: Number(p.sessions_count),
                duration_minutes: p.duration_minutes ?? null,
                price: Number(p.price),
                description: p.description ?? null,
              }}
            />
          </div>
        ))}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-[14px] font-bold">باقة جديدة</h3>
          <PackageEditor />
        </div>
      </main>
    </div>
  )
}
