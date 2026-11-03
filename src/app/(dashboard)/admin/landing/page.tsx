import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAdmin, getLandingContent } from '@/lib/courses'
import LandingEditor from './LandingEditor'

export const dynamic = 'force-dynamic'

export default async function AdminLandingPage() {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const content = await getLandingContent()
  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-12">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/courses" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold flex-1">تعديل اللاندنج بيدج</h1>
        <a href="/" target="_blank" className="text-[12px] font-semibold text-[#176b52] bg-white rounded-full px-3 py-1.5 shadow-sm">معاينة ↗</a>
      </header>
      <LandingEditor initial={content} />
    </div>
  )
}
