'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCertificate, markCertificateSent } from '@/app/actions/certificates'
import { waLink } from '@/lib/whatsapp'
import { whatsappMessage } from '@/lib/certificates'

export default function CertRowActions({ id, name, gender, phone, isAdmin }: { id: string; name: string; gender: 'male' | 'female'; phone: string | null; isAdmin: boolean }) {
  const router = useRouter()
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const url = () => `${window.location.origin}/certificate/${id}`
  return (
    <div className="mt-2 flex flex-wrap gap-3 text-[12px] font-bold">
      <a href={`/certificate/${id}`} target="_blank" style={{ color: '#176b52' }}>عرض / طباعة</a>
      <button type="button" style={{ color: '#128c4a' }} onClick={() => { window.open(waLink(phone, whatsappMessage({ studentName: name, gender, url: url() })), '_blank'); void markCertificateSent(id).then(() => router.refresh()) }}>واتساب</button>
      <button type="button" style={{ color: '#755b1b' }} onClick={async () => { try { await navigator.clipboard.writeText(url()); setMsg('تم نسخ الرابط ✓') } catch { setMsg(url()) } }}>نسخ الرابط</button>
      {isAdmin && (
        <button type="button" disabled={pending} style={{ color: '#93000a' }} onClick={() => { if (confirm('حذف الشهادة؟')) start(async () => { const r: any = await deleteCertificate(id); if (r?.error) setMsg(r.error); else router.refresh() }) }}>حذف</button>
      )}
      {msg && <span className="text-[11px]" style={{ color: '#6f7974' }}>{msg}</span>}
    </div>
  )
}
