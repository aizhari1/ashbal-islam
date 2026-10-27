import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function StudentsPage() {
  const supabase = await createClient()
  let students: Array<{
    id: string
    code: string
    name: string
    status: string
    amount_due: number
    teachers: { name: string } | null
  }> = []

  try {
    const { data } = await supabase
      .from('students')
      .select('id, code, name, status, amount_due, teachers(name)')
      .order('code')
      .limit(100)
    students = (data as typeof students) ?? []
  } catch {
    // schema not ready
  }

  const statusColor: Record<string, string> = {
    'نشط': 'bg-[rgba(35,132,91,0.12)] text-[#23845b]',
    'موقوف': 'bg-[#fff8e6] text-[#d49a35]',
    'منسحب': 'bg-[#ffdad6] text-[#ba1a1a]',
    'تجريبي': 'bg-[#e8f0fe] text-[#1a73e8]',
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="sticky top-0 z-50 bg-[#eefdf6]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold text-[#111e1a]">إدارة شؤون الطلاب</h1>
        <Link href="/admin/students/new" className="w-9 h-9 rounded-full bg-[#176b52] flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-white text-[20px]">add</span>
        </Link>
      </header>

      <main className="px-4 pb-24">
        <p className="text-[13px] text-[#6f7974] mb-3">{students.length} طالب</p>

        <div className="space-y-2">
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/admin/students/${s.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-[rgba(18,61,50,0.06)]"
            >
              <div className="w-11 h-11 rounded-full bg-[#e8f7f0] flex items-center justify-center text-[#176b52] font-bold shrink-0">
                {s.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#111e1a] truncate">{s.name}</p>
                <p className="text-[11px] text-[#6f7974]">
                  {s.code} · {s.teachers?.name || 'بدون معلم'}
                </p>
              </div>
              <div className="text-left shrink-0">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>
                {s.amount_due > 0 && (
                  <p className="text-[11px] text-[#ba1a1a] mt-1 font-medium">{s.amount_due} ج.م</p>
                )}
              </div>
            </Link>
          ))}

          {students.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-[40px] text-[#bec9c2]">school</span>
              <p className="text-[#6f7974] mt-2">لا يوجد طلاب بعد</p>
              <p className="text-[12px] text-[#bec9c2] mt-1">نفّذ migration الاستيراد في Supabase</p>
              <Link href="/admin/students/new" className="inline-block mt-3 text-[#176b52] font-bold text-[14px]">
                إضافة طالب
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
