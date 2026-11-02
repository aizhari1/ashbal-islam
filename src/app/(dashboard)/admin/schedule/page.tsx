import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

function monthBounds(key?: string) {
  if (!key || key === 'all') return { start: null as string | null, end: null as string | null, label: 'كل الشهور', key: 'all' }
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7))
  const start = `${y}-${String(m).padStart(2, '0')}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  const label = new Date(y, m - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
  return { start, end, label, key }
}

export default async function AttendanceArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>
}) {
  const sp = await searchParams
  const { start, end, label, key } = monthBounds(sp.month || 'all')
  const page = Math.max(1, Number(sp.page || 1))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let listQ = supabase
    .from('attendance')
    .select('id, session_date, status, notes, session_num, students(name, code), teachers(name)', { count: 'exact' })
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (start && end) listQ = listQ.gte('session_date', start).lte('session_date', end)

  const { data: rows, count: totalCount } = await listQ.range(from, to)

  let statsQ = supabase.from('attendance').select('status')
  if (start && end) statsQ = statsQ.gte('session_date', start).lte('session_date', end)
  const allStatuses: string[] = []
  let off = 0
  while (true) {
    const { data: chunk } = await statsQ.range(off, off + 999)
    if (!chunk?.length) break
    allStatuses.push(...chunk.map((c) => c.status || ''))
    if (chunk.length < 1000) break
    off += 1000
    if (off > 50000) break
  }
  const present = allStatuses.filter((s) => s === 'حاضر').length
  const absent = allStatuses.filter((s) => s === 'غائب' || s === 'غايب').length
  const total = allStatuses.length
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE))

  const months = ['all']
  const base = new Date()
  for (let i = 0; i < 8; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">الحضور والتحضير</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {label} · {total} سجل
          </p>
        </div>
      </header>

      <div className="px-4 mb-3 flex gap-2 overflow-x-auto pb-1">
        {months.map((m) => (
          <Link
            key={m}
            href={`/admin/schedule?month=${m}&page=1`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: m === key ? '#176b52' : '#fff',
              color: m === key ? '#fff' : '#3f4944',
              border: '1px solid #cde8dc',
            }}
          >
            {m === 'all' ? 'الكل' : m}
          </Link>
        ))}
      </div>

      <main className="px-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold">{total}</p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              إجمالي
            </p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#176b52' }}>
              {present}
            </p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              حاضر
            </p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[18px] font-bold" style={{ color: '#ba1a1a' }}>
              {absent}
            </p>
            <p className="text-[10px]" style={{ color: '#6f7974' }}>
              غائب
            </p>
          </div>
        </div>

        <Link href="/teacher/session" className="btn-primary block text-center py-3 mb-4 text-[14px]">
          + تسجيل حضور جديد
        </Link>

        <p className="text-[11px] mb-2" style={{ color: '#6f7974' }}>
          صفحة {page} / {totalPages}
        </p>

        <div className="space-y-2">
          {(rows ?? []).map((r: any) => (
            <div key={r.id} className="card p-3 flex justify-between items-center text-[13px] gap-2">
              <div className="min-w-0">
                <p className="font-bold truncate">{r.students?.name || '—'}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {r.students?.code || '—'} · {r.teachers?.name || '—'} · {String(r.session_date).slice(0, 10)}
                </p>
              </div>
              <span
                className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-full"
                style={{
                  background: r.status === 'حاضر' ? '#e8f7f0' : '#fce8e8',
                  color: r.status === 'حاضر' ? '#176b52' : '#ba1a1a',
                }}
              >
                {r.status}
              </span>
            </div>
          ))}
          {(rows ?? []).length === 0 && (
            <p className="text-center text-[13px] py-8" style={{ color: '#6f7974' }}>
              لا سجلات
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-3 mt-4">
            {page > 1 && (
              <Link
                href={`/admin/schedule?month=${key}&page=${page - 1}`}
                className="px-4 py-2 rounded-full text-[13px] font-bold bg-white"
                style={{ border: '1px solid #cde8dc', color: '#176b52' }}
              >
                السابق
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/schedule?month=${key}&page=${page + 1}`}
                className="px-4 py-2 rounded-full text-[13px] font-bold text-white"
                style={{ background: '#176b52' }}
              >
                التالي
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
