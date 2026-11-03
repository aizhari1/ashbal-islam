'use server'

import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin, slugify, DEFAULT_LANDING, type LandingContent } from '@/lib/courses'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXT_OK = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov', 'm4v', 'pdf']

function refresh(courseId?: string) {
  revalidatePath('/')
  revalidatePath('/admin/courses')
  if (courseId) revalidatePath(`/admin/courses/${courseId}`)
  revalidatePath('/student')
}

/** يرجّع رابط رفع موقّع — الرفع بيتم من المتصفح مباشرة (يتخطى حد 4.5MB بتاع Vercel) */
export async function createUploadUrl(bucket: 'landing-media' | 'course-media', filename: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (bucket !== 'landing-media' && bucket !== 'course-media') return { error: 'bucket غير صالح' }
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (!EXT_OK.includes(ext)) return { error: 'نوع الملف غير مدعوم' }

  const sb = serviceClient()
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`
  const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) return { error: error?.message || 'تعذر إنشاء رابط الرفع' }
  const publicUrl = bucket === 'landing-media' ? sb.storage.from(bucket).getPublicUrl(path).data.publicUrl : null
  return { ok: true as const, path, token: data.token, publicUrl }
}

export async function saveCourse(formData: FormData) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const sb = serviceClient()

  const id = String(formData.get('id') || '')
  const title = String(formData.get('title') || '').trim()
  if (!title) return { error: 'اسم الكورس مطلوب' }

  const row = {
    title,
    short_desc: String(formData.get('short_desc') || '').trim() || null,
    description: String(formData.get('description') || '').trim() || null,
    cover_url: String(formData.get('cover_url') || '').trim() || null,
    price: Number(formData.get('price') || 0) || 0,
    instructor: String(formData.get('instructor') || '').trim() || null,
    duration_label: String(formData.get('duration_label') || '').trim() || null,
    sort_order: Number(formData.get('sort_order') || 0) || 0,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
    const { error } = await sb.from('courses').update(row).eq('id', id)
    if (error) return { error: error.message }
    refresh(id)
    return { ok: true, id }
  }

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`
  const { data, error } = await sb.from('courses').insert({ ...row, slug }).select('id').single()
  if (error) return { error: error.message }
  refresh()
  return { ok: true, id: data.id as string }
}

export async function setCoursePublished(id: string, published: boolean) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const { error } = await serviceClient().from('courses').update({ is_published: published }).eq('id', id)
  if (error) return { error: error.message }
  refresh(id)
  return { ok: true }
}

export async function deleteCourse(id: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const sb = serviceClient()
  const { data: lessons } = await sb.from('course_lessons').select('storage_path').eq('course_id', id)
  const paths = (lessons || []).map((l) => l.storage_path).filter(Boolean) as string[]
  if (paths.length) await sb.storage.from('course-media').remove(paths)
  const { error } = await sb.from('courses').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh()
  return { ok: true }
}

export async function addLesson(input: {
  course_id: string
  title: string
  description?: string
  kind: 'video' | 'image' | 'file' | 'link'
  storage_path?: string | null
  external_url?: string | null
}) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!UUID.test(input.course_id)) return { error: 'معرّف غير صالح' }
  const title = (input.title || '').trim()
  if (!title) return { error: 'عنوان الدرس مطلوب' }
  if (input.kind === 'link' ? !input.external_url : !input.storage_path) return { error: 'ارفع الملف أو اكتب الرابط' }

  const sb = serviceClient()
  const { data: last } = await sb.from('course_lessons').select('position').eq('course_id', input.course_id).order('position', { ascending: false }).limit(1)
  const position = (last?.[0]?.position ?? 0) + 1
  const { error } = await sb.from('course_lessons').insert({
    course_id: input.course_id,
    title,
    description: input.description?.trim() || null,
    kind: input.kind,
    storage_path: input.kind === 'link' ? null : input.storage_path,
    external_url: input.kind === 'link' ? input.external_url : null,
    position,
  })
  if (error) return { error: error.message }
  refresh(input.course_id)
  return { ok: true }
}

export async function deleteLesson(id: string, courseId: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const sb = serviceClient()
  const { data: l } = await sb.from('course_lessons').select('storage_path').eq('id', id).maybeSingle()
  if (l?.storage_path) await sb.storage.from('course-media').remove([l.storage_path])
  const { error } = await sb.from('course_lessons').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh(courseId)
  return { ok: true }
}

export async function moveLesson(id: string, courseId: string, dir: 'up' | 'down') {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const sb = serviceClient()
  const { data: all } = await sb.from('course_lessons').select('id, position').eq('course_id', courseId).order('position')
  const list = all || []
  const i = list.findIndex((x) => x.id === id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return { ok: true }
  const [a, b] = [list[i], list[j]]
  await sb.from('course_lessons').update({ position: b.position }).eq('id', a.id)
  await sb.from('course_lessons').update({ position: a.position }).eq('id', b.id)
  refresh(courseId)
  return { ok: true }
}

/** زر الإدارة: تفعيل / إيقاف اشتراك */
export async function setEnrollmentStatus(id: string, courseId: string, status: 'active' | 'suspended' | 'pending') {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const patch: Record<string, unknown> = { status }
  if (status === 'active') { patch.activated_at = new Date().toISOString(); patch.activated_by = auth.userId }
  const { error } = await serviceClient().from('course_enrollments').update(patch).eq('id', id)
  if (error) return { error: error.message }
  refresh(courseId)
  return { ok: true }
}

export async function deleteEnrollment(id: string, courseId: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const { error } = await serviceClient().from('course_enrollments').delete().eq('id', id)
  if (error) return { error: error.message }
  refresh(courseId)
  return { ok: true }
}

/** إضافة طالب مباشرة بكوده (ومفعّل فورًا) */
export async function enrollStudentByCode(courseId: string, code: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const c = code.trim()
  if (!c) return { error: 'اكتب كود الطالب' }
  const sb = serviceClient()
  const { data: st } = await sb.from('students').select('id, name').ilike('code', c).maybeSingle()
  if (!st) return { error: 'كود الطالب غير موجود' }
  const { data: ex } = await sb.from('course_enrollments').select('id').eq('course_id', courseId).eq('student_id', st.id).maybeSingle()
  const now = new Date().toISOString()
  const { error } = ex
    ? await sb.from('course_enrollments').update({ status: 'active', activated_at: now, activated_by: auth.userId }).eq('id', ex.id)
    : await sb.from('course_enrollments').insert({ course_id: courseId, student_id: st.id, status: 'active', activated_at: now, activated_by: auth.userId })
  if (error) return { error: error.message }
  refresh(courseId)
  return { ok: true, name: st.name as string }
}

/** ربط طلب زائر بطالب موجود (بعد ما يتسجّل) */
export async function linkGuestToStudent(enrollmentId: string, courseId: string, code: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const sb = serviceClient()
  const { data: st } = await sb.from('students').select('id').ilike('code', code.trim()).maybeSingle()
  if (!st) return { error: 'كود الطالب غير موجود' }
  const { error } = await sb.from('course_enrollments').update({ student_id: st.id }).eq('id', enrollmentId)
  if (error) return { error: error.code === '23505' ? 'الطالب مشترك بالفعل في الكورس' : error.message }
  refresh(courseId)
  return { ok: true }
}

export async function saveLanding(content: LandingContent) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }
  const clean: LandingContent = { ...DEFAULT_LANDING, ...content }
  const { error } = await serviceClient()
    .from('settings')
    .upsert({ key: 'landing_content', value: JSON.stringify(clean), updated_at: new Date().toISOString() })
  if (error) return { error: error.message }
  revalidatePath('/')
  return { ok: true }
}
