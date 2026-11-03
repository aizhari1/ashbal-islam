'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MediaUploader from '@/components/MediaUploader'
import { saveCourse, setCoursePublished, deleteCourse } from '@/app/actions/courses'

export default function CourseEditor({ course }: { course: any }) {
  const router = useRouter()
  const [cover, setCover] = useState<string>(course.cover_url || '')
  const [published, setPublished] = useState<boolean>(!!course.is_published)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[14px]">بيانات الكورس</h2>
        <button
          onClick={() => start(async () => {
            const r: any = await setCoursePublished(course.id, !published)
            if (r?.error) return setMsg(r.error)
            setPublished(!published); setMsg('')
          })}
          className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${published ? 'bg-[#176b52] text-white' : 'bg-[#fff4d6] text-[#755b1b]'}`}>
          {published ? '● ظاهر في اللاندنج' : '○ مخفي — اضغط للإظهار'}
        </button>
      </div>

      <form className="space-y-3" action={(fd) => start(async () => {
        fd.set('id', course.id); fd.set('cover_url', cover)
        const r: any = await saveCourse(fd)
        setMsg(r?.error || 'تم الحفظ ✓'); router.refresh()
      })}>
        {cover && <img src={cover} alt="" className="w-full h-40 object-cover rounded-xl" />}
        <MediaUploader bucket="landing-media" accept="image/*" label={cover ? 'تغيير صورة الغلاف' : 'رفع صورة الغلاف'} onDone={(r) => setCover(r.publicUrl || '')} />
        <input name="title" defaultValue={course.title} className="input" placeholder="اسم الكورس" required />
        <textarea name="short_desc" defaultValue={course.short_desc || ''} rows={2} className="input" placeholder="وصف مختصر" />
        <textarea name="description" defaultValue={course.description || ''} rows={5} className="input" placeholder="الوصف الكامل" />
        <div className="grid grid-cols-2 gap-2">
          <input name="price" type="number" step="0.01" defaultValue={course.price ?? 0} className="input" placeholder="السعر" />
          <input name="sort_order" type="number" defaultValue={course.sort_order ?? 0} className="input" placeholder="الترتيب" />
          <input name="instructor" defaultValue={course.instructor || ''} className="input" placeholder="المحاضر" />
          <input name="duration_label" defaultValue={course.duration_label || ''} className="input" placeholder="المدة (مثال: 8 أسابيع)" />
        </div>
        <button disabled={pending} className="btn-primary w-full py-3">{pending ? 'جاري الحفظ...' : 'حفظ'}</button>
      </form>
      {msg && <p className="text-[12px] text-center" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>{msg}</p>}

      <button
        onClick={() => { if (confirm('حذف الكورس وكل دروسه واشتراكاته نهائيًا؟')) start(async () => { const r: any = await deleteCourse(course.id); if (r?.error) setMsg(r.error); else router.push('/admin/courses') }) }}
        className="w-full text-[12px] font-semibold py-2 rounded-lg" style={{ color: '#93000a', background: '#ffdad6' }}>
        حذف الكورس
      </button>
    </section>
  )
}
