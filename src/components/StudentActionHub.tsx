'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import StudentSearchSelect, { type SearchStudent } from '@/components/StudentSearchSelect'

type Props = {
  role: 'admin' | 'supervisor'
  backHref: string
}

const ACTIONS = (role: 'admin' | 'supervisor', s: SearchStudent) => {
  const base = role === 'admin' ? '/admin' : '/supervisor'
  return [
    {
      href: `${base === '/admin' ? '/admin/students' : '/admin/students'}/${s.id}`,
      icon: 'person',
      title: 'ملف الطالب',
      desc: 'بيانات · حالة · تفاصيل',
    },
    {
      href: role === 'admin' ? `/admin/payments?student=${s.id}` : `/supervisor/payment?student=${s.id}`,
      icon: 'payments',
      title: 'تسجيل دفعة',
      desc: 'مالية · طرق الدفع',
    },
    {
      href:
        role === 'admin'
          ? `/admin/edit-session?id=${s.id}`
          : `/supervisor/edit-student?id=${s.id}`,
      icon: 'edit_note',
      title: 'تعديل رقم الحصة',
      desc: 'آخر حصة مسجّلة',
    },
    {
      href: `/admin/transfer?student=${s.id}`,
      icon: 'swap_horiz',
      title: 'نقل / تغيير معلم',
      desc: 'تحويل لمعلم آخر',
    },
    {
      href: `/admin/notes?student=${s.id}`,
      icon: 'sticky_note_2',
      title: 'ملاحظات',
      desc: 'ملاحظات الإدارة',
    },
    {
      href: `/admin/students/${s.id}/certificate`,
      icon: 'workspace_premium',
      title: 'شهادة',
      desc: 'طباعة شهادة',
    },
    {
      href: `/student?code=${encodeURIComponent(s.code)}`,
      icon: 'school',
      title: 'بوابة الطالب',
      desc: 'عرض كما يراه الطالب',
    },
  ]
}

export default function StudentActionHub({ role, backHref }: Props) {
  const [students, setStudents] = useState<SearchStudent[]>([])
  const [selected, setSelected] = useState<SearchStudent | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    const sb = createClient()
    ;(async () => {
      setLoading(true)
      const { data, error } = await sb
        .from('students')
        .select('id, code, name, status, amount_due, last_session_num, teachers(name)')
        .order('name')
        .limit(500)
      if (error) {
        setErr(error.message)
        setLoading(false)
        return
      }
      setStudents(
        (data || []).map((r: any) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          status: r.status,
          amount_due: r.amount_due,
          last_session_num: r.last_session_num,
          teacher_name: r.teachers?.name || null,
        }))
      )
      setLoading(false)
    })()
  }, [])

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={backHref} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            بحث طالب وإجراء
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            ابحث · اختَر · نفّذ العملية
          </p>
        </div>
      </header>

      <main className="px-4 space-y-4">
        {loading && (
          <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
            جاري تحميل الطلاب...
          </p>
        )}
        {err && (
          <p className="text-center text-[13px] py-2 rounded-xl" style={{ background: '#ffdad6', color: '#93000a' }}>
            {err}
          </p>
        )}

        {!loading && (
          <div className="card p-4">
            <StudentSearchSelect
              students={students}
              selectedId={selected?.id}
              onSelect={setSelected}
              label="ابحث بالاسم أو الكود"
            />
          </div>
        )}

        {selected && (
          <div className="space-y-2">
            <p className="text-[12px] font-bold px-1" style={{ color: '#3f4944' }}>
              ماذا تريد أن تعمل مع {selected.name}؟
            </p>
            {ACTIONS(role, selected).map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm"
              >
                <span className="material-symbols-outlined text-[22px]" style={{ color: '#176b52' }}>
                  {a.icon}
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[14px]">{a.title}</span>
                  <span className="block text-[11px]" style={{ color: '#6f7974' }}>
                    {a.desc}
                  </span>
                </span>
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#bec9c2' }}>
                  chevron_left
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
