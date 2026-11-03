import Link from 'next/link'
import { serviceClient } from '@/lib/supabase/service'
import { getLandingContent } from '@/lib/courses'
import { Reveal, Counter } from '@/components/landing/Reveal'
import Header from '@/components/landing/Header'
import Faq from '@/components/landing/Faq'
import CoursesSection from '@/components/landing/CoursesSection'

export const revalidate = 60

function Star({ className = '' }: { className?: string }) {
  return (
    <svg className={`lp-star ${className}`} viewBox="0 0 200 200" fill="none" stroke="#fff" strokeWidth="1.2" aria-hidden>
      <rect x="45" y="45" width="110" height="110" />
      <rect x="45" y="45" width="110" height="110" transform="rotate(45 100 100)" />
      <circle cx="100" cy="100" r="62" />
      <circle cx="100" cy="100" r="30" />
    </svg>
  )
}

async function getCourses() {
  try {
    const { data } = await serviceClient()
      .from('courses')
      .select('id, title, short_desc, description, cover_url, price, currency, instructor, duration_label, course_lessons(id)')
      .eq('is_published', true)
      .order('sort_order')
      .order('created_at', { ascending: false })
    return (data || []).map((c: any) => ({ ...c, lessons: c.course_lessons?.length || 0, course_lessons: undefined }))
  } catch { return [] }
}

export default async function HomePage() {
  const [c, courses] = await Promise.all([getLandingContent(), getCourses()])
  const wa = c.whatsapp ? `https://wa.me/${c.whatsapp}?text=${encodeURIComponent('السلام عليكم، أريد الاستفسار عن ' + c.brand)}` : ''

  return (
    <main className="lp" id="top">
      <Header brand={c.brand} />

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-blob b1" /><div className="lp-blob b2" />
        <Star /><Star className="s2" />
        <div className="lp-wrap relative z-10 grid md:grid-cols-2 gap-10 items-center" style={{ padding: '140px 20px 110px' }}>
          <div>
            {c.heroBadge && (
              <span className="lp-rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)', animationDelay: '.1s' }}>
                <span className="material-symbols-outlined text-[16px]" style={{ color: '#e0c27a' }}>auto_awesome</span>{c.heroBadge}
              </span>
            )}
            <h1 className="lp-rise font-extrabold leading-[1.25] mt-5" style={{ fontSize: 'clamp(34px, 6vw, 58px)', animationDelay: '.25s' }}>
              {c.heroTitle}<br /><span className="lp-gold-text">{c.heroHighlight}</span>
            </h1>
            <p className="lp-rise text-[16px] md:text-[18px] leading-8 mt-5 max-w-xl" style={{ color: 'rgba(255,255,255,.85)', animationDelay: '.45s' }}>{c.heroSub}</p>
            <div className="lp-rise flex flex-wrap gap-3 mt-8" style={{ animationDelay: '.65s' }}>
              <a href={wa || '#courses'} target={wa ? '_blank' : undefined} rel="noopener" className="lp-btn gold">
                <span className="material-symbols-outlined text-[20px]">{wa ? 'chat' : 'school'}</span>{c.ctaPrimary}
              </a>
              <a href="#courses" className="lp-btn ghost">{c.ctaSecondary}</a>
            </div>
          </div>
          <div className="lp-rise relative hidden md:flex justify-center" style={{ animationDelay: '.5s' }}>
            {c.heroImage ? (
              <img src={c.heroImage} alt="" className="lp-bob relative z-10 w-full max-w-md rounded-[32px] object-cover aspect-[4/5]" style={{ boxShadow: '0 30px 80px rgba(0,0,0,.35)', border: '6px solid rgba(255,255,255,.15)' }} />
            ) : (
              <div className="lp-bob w-72 h-72 rounded-[56px] flex items-center justify-center" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,.18), rgba(255,255,255,.04))', border: '1px solid rgba(255,255,255,.25)', backdropFilter: 'blur(10px)', transform: 'rotate(-6deg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 150, color: '#e0c27a', fontVariationSettings: "'FILL' 1" }}>menu_book</span>
              </div>
            )}
          </div>
        </div>
        <svg viewBox="0 0 1440 80" className="absolute bottom-[-1px] left-0 w-full" preserveAspectRatio="none" aria-hidden><path d="M0 80V30C240 70 480 0 720 25s480 50 720 5v50z" fill="#eefdf6" /></svg>
      </section>

      {/* STATS */}
      {c.stats.length > 0 && (
        <section style={{ background: '#eefdf6', marginTop: -1 }}>
          <div className="lp-wrap grid grid-cols-2 md:grid-cols-4 gap-4 py-10">
            {c.stats.map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="text-center">
                  <div className="font-extrabold text-[#00513c]" style={{ fontSize: 'clamp(30px, 5vw, 46px)' }}><Counter value={s.value} suffix={s.suffix} /></div>
                  <div className="text-[14px] font-semibold text-[#6f7974] mt-1">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section id="features" className="lp-section" style={{ background: '#eefdf6' }}>
        <div className="lp-wrap">
          <Reveal><h2 className="lp-title">{c.featuresTitle}</h2></Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-12">
            {c.features.map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="lp-card p-6 h-full text-center">
                  <div className="lp-ico w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 32 }}>{f.icon}</span>
                  </div>
                  <h3 className="font-extrabold text-[17px] text-[#00513c] mb-2">{f.title}</h3>
                  <p className="text-[14px] leading-7 text-[#3f4944]">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COURSES */}
      {courses.length > 0 && (
        <section id="courses" className="lp-section" style={{ background: '#fff' }}>
          <div className="lp-wrap">
            <Reveal><h2 className="lp-title">{c.coursesTitle}</h2></Reveal>
            <Reveal delay={80}><p className="text-center text-[15px] text-[#6f7974] mt-5 max-w-xl mx-auto leading-7">{c.coursesSub}</p></Reveal>
            <div className="mt-12"><CoursesSection courses={courses as any} /></div>
          </div>
        </section>
      )}

      {/* STEPS */}
      <section id="steps" className="lp-section" style={{ background: 'linear-gradient(180deg,#eefdf6,#e2f5ec)' }}>
        <div className="lp-wrap">
          <Reveal><h2 className="lp-title">{c.stepsTitle}</h2></Reveal>
          <div className="grid gap-6 md:grid-cols-3 mt-12">
            {c.steps.map((s, i) => (
              <Reveal key={i} delay={i * 130}>
                <div className="lp-card p-7 text-center relative h-full">
                  <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-[22px] font-extrabold text-white mb-4" style={{ background: 'linear-gradient(135deg,#e0c27a,#c5a45d)' }}>{i + 1}</div>
                  <h3 className="font-extrabold text-[17px] text-[#00513c] mb-2">{s.title}</h3>
                  <p className="text-[14px] leading-7 text-[#3f4944]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {c.faq.length > 0 && (
        <section id="faq" className="lp-section" style={{ background: '#fff' }}>
          <div className="lp-wrap">
            <Reveal><h2 className="lp-title mb-12">{c.faqTitle}</h2></Reveal>
            <Reveal delay={100}><Faq items={c.faq} /></Reveal>
          </div>
        </section>
      )}

      {/* CTA + FOOTER */}
      <footer className="lp-hero" style={{ padding: '70px 0 30px' }}>
        <div className="lp-blob b1" style={{ opacity: .18 }} />
        <div className="lp-wrap relative z-10 text-center">
          <Reveal>
            <h2 className="font-extrabold" style={{ fontSize: 'clamp(24px,4vw,36px)' }}>جاهز تبدأ رحلتك مع القرآن؟</h2>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <a href={wa || '#courses'} target={wa ? '_blank' : undefined} rel="noopener" className="lp-btn gold">{c.ctaPrimary}</a>
              <Link href="/student" className="lp-btn ghost">بوابة الطالب</Link>
            </div>
          </Reveal>
          <div className="flex flex-wrap gap-5 justify-center mt-10 text-[13px]" style={{ color: 'rgba(255,255,255,.75)' }}>
            <Link href="/login?role=teacher" className="text-inherit no-underline">دخول المعلم</Link>
            <Link href="/login?role=supervisor" className="text-inherit no-underline">دخول الإشراف</Link>
            <Link href="/login?role=admin" className="text-inherit no-underline">دخول الإدارة</Link>
          </div>
          <p className="text-[12px] mt-6" style={{ color: 'rgba(255,255,255,.55)' }}>{c.footer}</p>
        </div>
      </footer>

      {wa && (
        <a href={wa} target="_blank" rel="noopener" className="lp-wa" aria-label="واتساب">
          <span className="material-symbols-outlined" style={{ fontSize: 30, fontVariationSettings: "'FILL' 1" }}>chat</span>
        </a>
      )}
    </main>
  )
}
