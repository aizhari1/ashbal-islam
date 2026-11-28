import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireStaff } from '@/lib/auth-guards'
import { loadBulkFeeRows } from './actions'
import BulkFeesClient from './BulkFeesClient'

export const dynamic = 'force-dynamic'

export default async function BulkFeesPage() {
  const auth = await requireStaff()
  if (!auth.ok) redirect('/login')
  const r = await loadBulkFeeRows()
  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-2xl mx-auto pb-16">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/students" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <h1 className="text-[16px] font-bold flex-1">تعميم الرسوم والأرباح</h1>
      </header>
      {r.error ? <p className="px-4 text-[13px]" style={{ color: '#93000a' }}>{r.error}</p> : <BulkFeesClient rows={r.rows || []} />}
    </div>
  )
}
