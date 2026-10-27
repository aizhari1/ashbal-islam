import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ background: '#eefdf6' }}>
      <div className="card max-w-sm w-full p-8 text-center space-y-5">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
        >
          <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
        </div>
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: '#00513c' }}>أكاديمية أشبال الإسلام</h1>
          <p className="text-[13px] mt-1" style={{ color: '#6f7974' }}>تحفيظ القرآن الكريم · إدارة الحلقات</p>
        </div>
        <Link href="/login" className="btn-primary block w-full py-3.5 text-[15px]">
          تسجيل الدخول
        </Link>
        <Link href="/evaluate" className="block text-[13px] font-medium" style={{ color: '#176b52' }}>
          تقييم أولياء الأمور
        </Link>
      </div>
    </main>
  )
}
