import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#eefdf6]">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[rgba(18,61,50,0.06)] max-w-sm w-full text-center space-y-5">
        <div className="w-20 h-20 mx-auto rounded-full bg-[#176b52] flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-4xl text-white">menu_book</span>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[#00513c]">أكاديمية موعظة ونور</h1>
          <p className="text-[13px] text-[#6f7974] mt-1">أشبال الإسلام · تحفيظ القرآن الكريم</p>
        </div>
        <Link
          href="/login"
          className="block w-full bg-[#176b52] text-white py-3.5 rounded-xl text-[15px] font-bold shadow-sm hover:bg-[#123d32] transition-colors"
        >
          تسجيل الدخول
        </Link>
      </div>
    </main>
  )
}
