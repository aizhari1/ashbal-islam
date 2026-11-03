import Link from 'next/link'
import { redirect } from 'next/navigation'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'
import NewCourseButton from './NewCourseButton'

export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const sb = serviceClient()
  const [{ data: courses }, { data: enr }, { data: les }] = await Promise.all([
    sb.from('courses').select('*').order('sort_order').order('created_at', { ascending: false }),
    sb.from('course_enrollments').select('course_id, status'),
    sb.from('course_lessons').select('course_id'),
  ])
  const count = (cid: string, st?: string) => (enr || []).filter((e) => e.course_id === cid && (!st || e.status === st)).length

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-10">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/more" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold flex-1">الكورسات</h1>
        <Link href="/admin/landing" className="text-[12px] font-semibold text-[#176b52] bg-white rounded-full px-3 py-1.5 shadow-sm">
          تعديل اللاندنج
        </Link>
      </header>

      <main className="px-4 space-y-3">
        <NewCourseButton />
        {(courses || []).length === 0 && (
          <p className="text-center text-[13px] py-10" style={{ color: '#6f7974' }}>لا توجد كورسات بعد — أنشئ أول كورس</p>
        )}
        {(courses || []).map((c) => {
          const pending = count(c.id, 'pending')
          return (
            <Link key={c.id} href={`/admin/courses/${c.id}`} className="card p-3 flex gap-3 items-center">
              <div className="w-16 h-16 rounded-xl bg-[#e8f7f0] overflow-hidden flex items-center justify-center shrink-0">
                {c.cover_url ? <img src={c.cover_url} alt="" className="w-full h-full object-cover" /> :
                  <span className="material-symbols-outlined text-[#176b52]">school</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] truncate">{c.title}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {(les || []).filter((l) => l.course_id === c.id).length} درس · {count(c.id, 'active')} مشترك مفعّل
                </p>
                <div className="flex gap-1.5 mt-1">
                  <span className={c.is_published ? 'badge-ok' : 'badge-warn'}>{c.is_published ? 'ظاهر في اللاندنج' : 'مخفي'}</span>
                  {pending > 0 && <span className="badge-err">{pending} طلب جديد</span>}
                </div>
              </div>
              <span className="material-symbols-outlined text-[#bec9c2]">chevron_left</span>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
