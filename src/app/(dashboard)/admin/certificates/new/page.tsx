import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import CertificateBuilder from './CertificateBuilder'

export const dynamic = 'force-dynamic'

export default async function NewCertificatePage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!['admin', 'supervisor'].includes(String(p?.role))) redirect('/login')

  const sp = await searchParams
  const { data } = await serviceClient().from('students').select('id, code, name, phone, status, teachers(name)').in('status', ['نشط', 'موقوف']).order('name').limit(2000)
  const students = (data || []).map((s: any) => ({ id: s.id, code: s.code, name: s.name, phone: s.phone, teacher: s.teachers?.name || '' }))

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-2xl mx-auto pb-16">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/certificates" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <h1 className="text-[16px] font-bold">شهادة تقدير جديدة</h1>
      </header>
      <CertificateBuilder students={students} initialStudentId={sp.student} />
    </div>
  )
}
