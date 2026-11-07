import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentMonthKey, monthBounds, monthLabelAr } from '@/lib/dues'
import { serviceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { SettleClient } from './SettleClient'

export const dynamic = 'force-dynamic'

export default async function SessionSettlePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; month?: string }>
}) {
  try {
    const sp = await searchParams
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonthKey()
    const { start, end } = monthBounds(month)

    // service client عشان الصفحة تفتح حتى لو RLS ضيّق
    const sb = serviceClient()
    const { data: students, error: stErr } = await sb
      .from('students')
      .select('id, code, name, last_session_num, teacher_id, teachers(name)')
      .in('status', ['نشط', 'موقوف', 'تجريبي'])
      .order('name')
      .limit(800)

    if (stErr) {
      return (
        <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
          <Link href="/admin" className="text-[13px]" style={{ color: '#176b52' }}>
            ← رجوع
          </Link>
          <p className="mt-4 card p-4 text-[13px]" style={{ color: '#93000a' }}>
            خطأ في تحميل الطلاب: {stErr.message}
          </p>
        </div>
      )
    }

    let sessions: any[] = []
    let selected: any = null
    if (sp.student) {
      selected = (students ?? []).find((s: any) => s.id === sp.student) || null
      if (!selected) {
        const { data: one } = await sb
          .from('students')
          .select('id, code, name, last_session_num, teacher_id, teachers(name)')
          .eq('id', sp.student)
          .maybeSingle()
        selected = one
      }
      const { data } = await sb
        .from('attendance')
        .select(
          'id, session_date, session_num, status, notes, session_duration, teacher_id, teachers(name)'
        )
        .eq('student_id', sp.student)
        .gte('session_date', start)
        .lte('session_date', end)
        .order('session_date', { ascending: false })
        .limit(300)
      sessions = data ?? []
    }

    const list = (students ?? []).map((s: any) => ({
      ...s,
      teachers: Array.isArray(s.teachers) ? s.teachers[0] || null : s.teachers || null,
    }))
    if (selected) {
      selected = {
        ...selected,
        teachers: Array.isArray(selected.teachers) ? selected.teachers[0] || null : selected.teachers || null,
      }
    }

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
              {monthLabelAr(month)} — ابحث عن طالب · احذف · عدّل الرقم
            </p>
          </div>
        </header>

        <SettleClient students={list} selectedId={sp.student || ''} month={month} sessions={sessions} selected={selected} />
      </div>
    )
  } catch (e: any) {
    return (
      <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
        <Link href="/admin" className="text-[13px]" style={{ color: '#176b52' }}>
          ← رجوع للإدارة
        </Link>
        <p className="mt-4 card p-4 text-[13px]" style={{ color: '#93000a' }}>
          الصفحة اتعطلت مؤقتًا: {e?.message || 'خطأ غير معروف'}
        </p>
        <a href="/admin/session-settle" className="block mt-3 text-center font-bold" style={{ color: '#176b52' }}>
          إعادة فتح التسوية
        </a>
      </div>
    )
  }
}
