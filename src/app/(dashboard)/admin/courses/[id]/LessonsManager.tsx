'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MediaUploader from '@/components/MediaUploader'
import { addLesson, deleteLesson, moveLesson } from '@/app/actions/courses'

const KINDS = [
  { v: 'video', label: 'فيديو', icon: 'play_circle', accept: 'video/*' },
  { v: 'image', label: 'صورة', icon: 'image', accept: 'image/*' },
  { v: 'file', label: 'ملف PDF', icon: 'picture_as_pdf', accept: 'application/pdf' },
  { v: 'link', label: 'رابط', icon: 'link', accept: '' },
] as const

export default function LessonsManager({ courseId, lessons }: { courseId: string; lessons: any[] }) {
  const router = useRouter()
  const [kind, setKind] = useState<'video' | 'image' | 'file' | 'link'>('video')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<{ path: string; fileName: string } | null>(null)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const k = KINDS.find((x) => x.v === kind)!

  function submit() {
    start(async () => {
      const r: any = await addLesson({ course_id: courseId, title, description: desc, kind, storage_path: file?.path, external_url: url })
      if (r?.error) return setMsg(r.error)
      setTitle(''); setDesc(''); setUrl(''); setFile(null); setMsg(''); router.refresh()
    })
  }

  return (
    <section className="card p-4 space-y-3">
      <h2 className="font-bold text-[14px]">الدروس ({lessons.length})</h2>

      <ul className="space-y-2">
        {lessons.map((l, i) => (
          <li key={l.id} className="flex items-center gap-2 bg-[#f4fbf7] rounded-xl p-2.5">
            <span className="material-symbols-outlined text-[#176b52]">{KINDS.find((x) => x.v === l.kind)?.icon}</span>
            <span className="flex-1 text-[13px] font-semibold truncate">{i + 1}. {l.title}</span>
            <button disabled={pending || i === 0} onClick={() => start(async () => { await moveLesson(l.id, courseId, 'up'); router.refresh() })} className="disabled:opacity-30">
              <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span></button>
            <button disabled={pending || i === lessons.length - 1} onClick={() => start(async () => { await moveLesson(l.id, courseId, 'down'); router.refresh() })} className="disabled:opacity-30">
              <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span></button>
            <button onClick={() => { if (confirm('حذف الدرس؟')) start(async () => { await deleteLesson(l.id, courseId); router.refresh() }) }} style={{ color: '#93000a' }}>
              <span className="material-symbols-outlined text-[18px]">delete</span></button>
          </li>
        ))}
        {lessons.length === 0 && <li className="text-[12px] text-center py-3" style={{ color: '#6f7974' }}>لا توجد دروس بعد</li>}
      </ul>

      <div className="border-t border-[#e5efe8] pt-3 space-y-2.5">
        <p className="text-[12px] font-semibold">إضافة درس</p>
        <div className="grid grid-cols-4 gap-1.5">
          {KINDS.map((x) => (
            <button key={x.v} type="button" onClick={() => { setKind(x.v); setFile(null) }}
              className={`rounded-lg py-2 text-[11px] font-bold flex flex-col items-center ${kind === x.v ? 'bg-[#176b52] text-white' : 'bg-white border border-[#e5efe8]'}`}>
              <span className="material-symbols-outlined text-[18px]">{x.icon}</span>{x.label}
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="عنوان الدرس" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="input" placeholder="وصف (اختياري)" />
        {kind === 'link' ? (
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="input" dir="ltr" placeholder="رابط يوتيوب / فيميو / أي رابط" />
        ) : file ? (
          <p className="text-[12px] rounded-lg bg-[#e8f7f0] p-2.5" style={{ color: '#176b52' }}>✓ تم رفع: {file.fileName}</p>
        ) : (
          <MediaUploader bucket="course-media" accept={k.accept} label={`رفع ${k.label}`} onDone={(r) => { setFile({ path: r.path, fileName: r.fileName }); if (!title) setTitle(r.fileName.replace(/\.[^.]+$/, '')) }} />
        )}
        <button disabled={pending} onClick={submit} className="btn-primary w-full py-2.5">{pending ? '...' : 'إضافة الدرس'}</button>
        {msg && <p className="text-[12px]" style={{ color: '#93000a' }}>{msg}</p>}
        <p className="text-[11px]" style={{ color: '#6f7974' }}>
          ملاحظة: حد حجم الملف الواحد في Supabase المجاني 50MB. للفيديوهات الأكبر ارفعها على يوتيوب (غير مدرج) واستخدم "رابط".
        </p>
      </div>
    </section>
  )
}
