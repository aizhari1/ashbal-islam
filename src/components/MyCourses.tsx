'use client'

import { useEffect, useState } from 'react'

type Lesson = { id: string; title: string; description: string | null; kind: string; url: string | null; embed: string | null; link: string | null }
type Course = { id: string; title: string; short_desc: string | null; cover_url: string | null; instructor: string | null; status: string; lessons: Lesson[] }

export default function MyCourses({ code }: { code: string }) {
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/student-courses?code=' + encodeURIComponent(code)).then((r) => r.json()).then((j) => alive && setCourses(j.courses || [])).catch(() => alive && setCourses([]))
    return () => { alive = false }
  }, [code])

  if (!courses || courses.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-[15px] font-bold" style={{ color: '#00513c' }}>كورساتي</h2>
      {courses.map((c) => {
        const open = openId === c.id
        const cur = c.lessons.find((l) => l.id === lessonId) || c.lessons[0]
        return (
          <div key={c.id} className="card overflow-hidden">
            <button onClick={() => { setOpenId(open ? null : c.id); setLessonId(null) }} className="w-full flex items-center gap-3 p-3 text-right bg-transparent border-0">
              <div className="w-14 h-14 rounded-xl bg-[#e8f7f0] overflow-hidden flex items-center justify-center shrink-0">
                {c.cover_url ? <img src={c.cover_url} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#176b52]">school</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] truncate">{c.title}</p>
                {c.status === 'active'
                  ? <span className="badge-ok">{c.lessons.length} درس</span>
                  : <span className="badge-warn">بانتظار تفعيل الإدارة</span>}
              </div>
              {c.status === 'active' && <span className="material-symbols-outlined text-[#bec9c2]">{open ? 'expand_less' : 'expand_more'}</span>}
            </button>

            {open && c.status === 'active' && cur && (
              <div className="border-t border-[#e5efe8] p-3 space-y-3">
                <div className="rounded-xl overflow-hidden bg-black">
                  {cur.kind === 'video' && cur.url && <video key={cur.id} src={cur.url} controls playsInline controlsList="nodownload" className="w-full max-h-[60vh]" />}
                  {cur.kind === 'image' && cur.url && <img key={cur.id} src={cur.url} alt={cur.title} className="w-full" />}
                  {cur.kind === 'link' && cur.embed && <iframe key={cur.id} src={cur.embed} className="w-full aspect-video" allow="fullscreen; picture-in-picture" allowFullScreen />}
                </div>
                {cur.kind === 'file' && cur.url && <a href={cur.url} target="_blank" rel="noopener" className="btn-primary block text-center py-3">فتح الملف</a>}
                {cur.kind === 'link' && !cur.embed && cur.link && <a href={cur.link} target="_blank" rel="noopener" className="btn-primary block text-center py-3">فتح الرابط</a>}
                <div>
                  <p className="font-bold text-[14px]">{cur.title}</p>
                  {cur.description && <p className="text-[12px] mt-1 leading-6" style={{ color: '#6f7974' }}>{cur.description}</p>}
                </div>
                <ul className="space-y-1.5">
                  {c.lessons.map((l, i) => (
                    <li key={l.id}>
                      <button onClick={() => setLessonId(l.id)} className={`w-full flex items-center gap-2 rounded-lg p-2.5 text-right text-[13px] border-0 ${l.id === cur.id ? 'bg-[#176b52] text-white font-bold' : 'bg-[#f4fbf7]'}`}>
                        <span className="material-symbols-outlined text-[18px]">{l.kind === 'video' ? 'play_circle' : l.kind === 'image' ? 'image' : l.kind === 'file' ? 'picture_as_pdf' : 'link'}</span>
                        <span className="flex-1 truncate">{i + 1}. {l.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
