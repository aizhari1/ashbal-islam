import Link from 'next/link'

const roles = [
  {
    href: '/student',
    icon: 'school',
    title: 'طالب',
    desc: 'شوف مواعيدك والمستحقات وتقييمات الحصص بكودك',
    color: '#176b52',
    bg: 'linear-gradient(145deg, #1a8a68, #0d5c45)',
  },
  {
    href: '/login?role=teacher',
    icon: 'record_voice_over',
    title: 'معلم',
    desc: 'تسجيل الحضور · تقارير الحلقات · المستحقات',
    color: '#755b1b',
    bg: 'linear-gradient(145deg, #c5a45d, #755b1b)',
  },
  {
    href: '/login?role=admin',
    icon: 'admin_panel_settings',
    title: 'إدارة',
    desc: 'الطلاب · المالية · التقارير · المستخدمين',
    color: '#00513c',
    bg: 'linear-gradient(145deg, #176b52, #003d2e)',
  },
  {
    href: '/login?role=supervisor',
    icon: 'supervisor_account',
    title: 'إشراف',
    desc: 'متابعة المعلمين · التذكير · المواعيد',
    color: '#3d665a',
    bg: 'linear-gradient(145deg, #4a7d70, #2a4a42)',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(180deg, #eefdf6 0%, #e2f5ec 40%, #fafaf8 100%)' }}>
      <section className="px-5 pt-10 pb-6 text-center">
        <div
          className="w-24 h-24 mx-auto rounded-[28px] flex items-center justify-center shadow-xl mb-5"
          style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
        >
          <span className="material-symbols-outlined text-5xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
        </div>
        <h1 className="text-[26px] font-bold leading-tight" style={{ color: '#00513c' }}>
          أكاديمية أشبال الإسلام
        </h1>
        <p className="text-[14px] mt-2 max-w-xs mx-auto leading-relaxed" style={{ color: '#6f7974' }}>
          تحفيظ القرآن الكريم · إدارة الحلقات والمعلمين والطلاب
        </p>
      </section>

      <section className="px-4 flex-1 pb-6">
        <p className="text-center text-[13px] font-semibold mb-4" style={{ color: '#3f4944' }}>
          اختر طريقة الدخول
        </p>
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="card flex flex-col items-center text-center p-5 min-h-[168px] transition-transform active:scale-[0.97]"
              style={{ border: 'none', boxShadow: '0 8px 28px rgba(0,81,60,0.08)' }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-md"
                style={{ background: r.bg }}
              >
                <span
                  className="material-symbols-outlined text-white text-[36px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {r.icon}
                </span>
              </div>
              <span className="text-[16px] font-bold" style={{ color: r.color }}>
                {r.title}
              </span>
              <span className="text-[11px] mt-1.5 leading-snug" style={{ color: '#6f7974' }}>
                {r.desc}
              </span>
            </Link>
          ))}
        </div>

        <div className="max-w-md mx-auto mt-5 space-y-2.5">
          <Link
            href="/evaluate"
            className="card flex items-center gap-3 p-4 active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 4px 16px rgba(0,81,60,0.06)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#e8f7f0' }}
            >
              <span className="material-symbols-outlined text-[28px]" style={{ color: '#176b52', fontVariationSettings: "'FILL' 1" }}>
                rate_review
              </span>
            </div>
            <div className="text-right flex-1">
              <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>تقييم أولياء الأمور</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>بدون تسجيل دخول — قيّم المعلم والحلقة</p>
            </div>
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#6f7974' }}>chevron_left</span>
          </Link>

          <Link
            href="/login"
            className="card flex items-center gap-3 p-4 active:scale-[0.98] transition-transform"
            style={{ boxShadow: '0 4px 16px rgba(0,81,60,0.06)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#f5f0e6' }}
            >
              <span className="material-symbols-outlined text-[28px]" style={{ color: '#755b1b', fontVariationSettings: "'FILL' 1" }}>
                key
              </span>
            </div>
            <div className="text-right flex-1">
              <p className="text-[14px] font-bold" style={{ color: '#00513c' }}>دخول بالكود مباشرة</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>للإدارة · المعلم · الإشراف</p>
            </div>
            <span className="material-symbols-outlined text-[20px]" style={{ color: '#6f7974' }}>chevron_left</span>
          </Link>
        </div>
      </section>

      <footer className="text-center py-5 text-[11px]" style={{ color: '#6f7974' }}>
        © أكاديمية أشبال الإسلام
      </footer>
    </main>
  )
}
