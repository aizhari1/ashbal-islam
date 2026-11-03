import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'
import CourseEditor from './CourseEditor'
import LessonsManager from './LessonsManager'
import EnrollmentsPanel from './EnrollmentsPanel'

export const dynamic = 'force-dynamic'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const sb = serviceClient()
  const [{ data: course }, { data: lessons }, { data: enr }] = await Promise.all([
    sb.from('courses').select('*').eq('id', id).maybeSingle(),
    sb.from('course_lessons').select('*').eq('course_id', id).order('position'),
    sb.from('course_enrollments').select('*, students(code, name)').eq('course_id', id).order('created_at', { ascending: false }),
  ])
  if (!course) notFound()

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-12">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/courses" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold truncate">{course.title}</h1>
      </header>
      <main className="px-4 space-y-4">
        <EnrollmentsPanel courseId={id} rows={(enr || []) as any} />
        <LessonsManager courseId={id} lessons={(lessons || []) as any} />
        <CourseEditor course={course as any} />
      </main>
    </div>
  )
}
