import { redirect } from 'next/navigation'

/** الشهادة القديمة (تصميم واحد) اتستبدلت بنظام الشهادات الجديد بقوالب متعددة */
export default async function OldCertificateRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/certificates/new?student=${encodeURIComponent(id)}`)
}
