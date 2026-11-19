import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { serviceClient } from '@/lib/supabase/service'
import { CertificateCard, ScaledCertificate } from '@/components/certificate/CertificateView'
import ShareBar from '@/components/certificate/ShareBar'
import type { CertificateData } from '@/lib/certificates'
import { DEFAULT_SIGNER, defaultMessage } from '@/lib/certificates'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'شهادة تقدير — أشبال الإسلام', robots: { index: false, follow: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PublicCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { data: c } = await serviceClient().from('certificates').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()

  const data: CertificateData = {
    template: c.template, gender: c.gender, title: c.title, studentName: c.student_name, teacherName: c.teacher_name || '',
    memorized: c.memorized || '', progress: c.progress || '', message: c.message || defaultMessage(c.gender),
    issueDate: c.issue_date, signer: c.signer || DEFAULT_SIGNER,
  }

  return (
    <main className="min-h-dvh px-3 py-6" style={{ background: '#eefdf6' }}>
      <style>{`
        @media screen { .print-only { display: none; } }
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { display: block; position: absolute; top: 0; left: 0; zoom: 1.02; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="rounded-2xl overflow-hidden shadow-lg bg-white"><ScaledCertificate data={data} /></div>
        <div className="max-w-md mx-auto"><ShareBar data={data} certId={id} showPrint /></div>
      </div>
      <div className="print-only"><CertificateCard data={data} /></div>
    </main>
  )
}
