'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Header({ brand }: { brand: string }) {
  const [solid, setSolid] = useState(false)
  const [prog, setProg] = useState(0)
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    const on = () => {
      setSolid(window.scrollY > 40)
      const h = document.documentElement.scrollHeight - window.innerHeight
      setProg(h > 0 ? window.scrollY / h : 0)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <>
      <div className="lp-progress" style={{ width: '100%', transform: `scaleX(${prog})` }} />
      <header className={`lp-header ${solid ? 'solid' : ''}`}>
        <div className="lp-wrap flex items-center gap-4">
          <a href="#top" className="lp-brand flex items-center gap-2 font-extrabold text-white text-[17px] no-underline">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: '#c5a45d' }}>menu_book</span>{brand}
          </a>
          <nav className="lp-nav hidden md:flex gap-6 mr-auto">
            <a href="#features">المميزات</a><a href="#courses">الكورسات</a><a href="#steps">كيف أبدأ</a><a href="#faq">أسئلة</a>
          </nav>
          <div className="mr-auto md:mr-0 relative">
            <button onClick={() => setMenu(!menu)} className="lp-btn green !py-2 !px-4 !text-[13px]">
              <span className="material-symbols-outlined text-[18px]">login</span> دخول
            </button>
            {menu && (
              <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl p-2 text-[14px]" onClick={() => setMenu(false)}>
                {[['/student', 'school', 'بوابة الطالب'], ['/login?role=teacher', 'record_voice_over', 'المعلم'], ['/login?role=supervisor', 'supervisor_account', 'الإشراف'], ['/login?role=admin', 'admin_panel_settings', 'الإدارة']].map(([h, i, t]) => (
                  <Link key={h} href={h} className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[#eefdf6] text-[#00513c] font-semibold no-underline">
                    <span className="material-symbols-outlined text-[18px]">{i}</span>{t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
