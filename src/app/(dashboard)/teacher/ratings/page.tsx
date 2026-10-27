import Link from 'next/link'
export default function TeacherRatingsPage() {
  return (
    <div className="min-h-dvh bg-[#f5f0e8] max-w-lg mx-auto p-4">
      <Link href="/teacher" className="text-[#0d9b8a] text-[13px]">← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">تقييماتي</h1>
      <p className="text-[13px] text-[#6f7974] mt-3">تظهر تقييمات أولياء الأمور بعد إرسالها من الفورم العام.</p>
      <Link href="/evaluate" className="inline-block mt-4 text-[#0d9b8a] font-bold text-[14px]">فتح فورم التقييم ←</Link>
    </div>
  )
}
