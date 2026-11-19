'use client'

import { useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { CertificateCard, CERT_H, CERT_W } from './CertificateView'
import type { CertificateData } from '@/lib/certificates'
import { whatsappMessage } from '@/lib/certificates'
import { waLink } from '@/lib/whatsapp'
import { markCertificateSent } from '@/app/actions/certificates'

/** أزرار الإرسال: صورة على واتساب · رابط · تحميل · طباعة */
export default function ShareBar({
  data,
  certId,
  phone,
  staff = false,
  showPrint = false,
}: {
  data: CertificateData
  certId: string
  phone?: string | null
  staff?: boolean
  showPrint?: boolean
}) {
  const capRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const url = () => `${window.location.origin}/certificate/${certId}`
  const sent = () => { if (staff) void markCertificateSent(certId) }

  async function makeFile(): Promise<File | null> {
    const node = capRef.current?.firstElementChild as HTMLElement | null
    if (!node) return null
    try { await (document as any).fonts?.ready } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 250))
    const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true, width: CERT_W, height: CERT_H, style: { transform: 'none' } })
    return blob ? new File([blob], `شهادة-${data.studentName}.png`, { type: 'image/png' }) : null
  }

  async function shareImage() {
    setBusy(true); setMsg('')
    try {
      const file = await makeFile()
      if (!file) throw new Error('تعذر تجهيز الصورة')
      const text = whatsappMessage({ studentName: data.studentName, gender: data.gender, url: url() })
      const nav: any = navigator
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text })
        sent()
        setMsg('تم فتح المشاركة ✓')
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file); a.download = file.name; a.click()
        window.open(waLink(phone, text), '_blank')
        sent()
        setMsg('اتحمّلت الصورة — ارفقها في المحادثة اللي اتفتحت')
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setMsg(e?.message || 'تعذر المشاركة')
    } finally { setBusy(false) }
  }

  async function download() {
    setBusy(true); setMsg('')
    try {
      const file = await makeFile()
      if (!file) throw new Error('تعذر تجهيز الصورة')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(file); a.download = file.name; a.click()
    } catch (e: any) { setMsg(e?.message || 'تعذر التحميل') } finally { setBusy(false) }
  }

  const sendLink = () => {
    window.open(waLink(phone, whatsappMessage({ studentName: data.studentName, gender: data.gender, url: url() })), '_blank')
    sent()
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(url()); setMsg('تم نسخ الرابط ✓') } catch { setMsg(url()) }
  }

  const btn = 'rounded-xl px-4 py-2.5 text-[13px] font-bold'
  return (
    <div>
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden ref={capRef}>
        <CertificateCard data={data} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {staff && <button type="button" disabled={busy} onClick={shareImage} className={`${btn} text-white col-span-2`} style={{ background: '#25D366' }}>{busy ? 'جاري التجهيز...' : 'إرسال الشهادة كصورة (واتساب)'}</button>}
        {staff && <button type="button" onClick={sendLink} className={`${btn} text-white`} style={{ background: '#176b52' }}>إرسال الرابط واتساب</button>}
        <button type="button" onClick={copy} className={btn} style={{ background: '#e8f7f0', color: '#176b52' }}>نسخ الرابط</button>
        <button type="button" disabled={busy} onClick={download} className={btn} style={{ background: '#e8f7f0', color: '#176b52' }}>تحميل صورة</button>
        {showPrint && <button type="button" onClick={() => window.print()} className={btn} style={{ background: '#fff4d6', color: '#755b1b' }}>طباعة / PDF</button>}
      </div>
      {msg && <p className="text-[12px] mt-2 text-center" style={{ color: '#176b52' }}>{msg}</p>}
    </div>
  )
}
