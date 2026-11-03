import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { toEmbedUrl } from '@/lib/courses'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// كورسات الطالب المفعّلة فقط، وروابط الملفات موقّعة ومؤقتة (ساعتين)
export async function GET(req: NextRequest) {
  const code = String(req.nextUrl.searchParams.get('code') || '').trim()
  if (code.length < 2) return NextResponse.json({ error: 'اكتب كود الطالب' }, { status: 400 })

  const sb = serviceClient()
  const { data: st } = await sb.from('students').select('id').ilike('code', code).maybeSingle()
  if (!st) return NextResponse.json({ courses: [] })

  const { data: enr } = await sb
    .from('course_enrollments')
    .select('status, courses(id, title, short_desc, cover_url, instructor, course_lessons(id, title, description, kind, storage_path, external_url, position))')
    .eq('student_id', st.id)
    .in('status', ['active', 'pending'])

  const rows = (enr || []).filter((e: any) => e.courses)
  const paths = rows.flatMap((e: any) =>
    e.status === 'active' ? e.courses.course_lessons.map((l: any) => l.storage_path).filter(Boolean) : []
  )
  const urlMap: Record<string, string> = {}
  if (paths.length) {
    const { data: signed } = await sb.storage.from('course-media').createSignedUrls(paths, 7200)
    for (const s of signed || []) if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl
  }

  const courses = rows.map((e: any) => {
    const c = e.courses
    const active = e.status === 'active'
    return {
      id: c.id, title: c.title, short_desc: c.short_desc, cover_url: c.cover_url, instructor: c.instructor,
      status: e.status,
      lessons: active
        ? [...c.course_lessons].sort((a: any, b: any) => a.position - b.position).map((l: any) => ({
            id: l.id, title: l.title, description: l.description, kind: l.kind,
            url: l.storage_path ? urlMap[l.storage_path] || null : null,
            embed: l.external_url ? toEmbedUrl(l.external_url) : null,
            link: l.external_url || null,
          }))
        : [],
    }
  })
  return NextResponse.json({ courses })
}
