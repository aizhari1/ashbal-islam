import Link from 'next/link'
import { SettleShell } from './SettleShell'

export const dynamic = 'force-dynamic'

/** صفحة خفيفة — مفيش استعلام ثقيل على السيرفر عشان الزر يفتح فورًا */
export default function SessionSettlePage() {
  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تسوية حصص طالب / معلم
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            ابحث عن طالب · احذف حصة · عدّل رقم الحصة
          </p>
        </div>
      </header>
      <SettleShell />
    </div>
  )
}
