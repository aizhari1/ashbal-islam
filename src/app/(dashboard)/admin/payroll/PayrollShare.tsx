'use client'

import { useMemo, useState } from 'react'

type SessionRow = {
  date: string
  num: number | null
  price: number
}

type StudentGroup = {
  name: string
  code: string
  price: number
  sessions: SessionRow[]
}

export function PayrollShare({
  teacherName,
  teacherCode,
  monthLabel,
  totalSessions,
  totalPay,
  groups,
}: {
  teacherName: string
  teacherCode: string
  monthLabel: string
  totalSessions: number
  totalPay: number
  groups: StudentGroup[]
}) {
  const [copied, setCopied] = useState(false)

  const message = useMemo(() => {
    const lines: string[] = []
    lines.push(`🌿 *أكاديمية أشبال الإسلام*}`)
    lines.push(`📋 *تفاصيل راتب المعلم*`)`
    lines.push(``)
    lines.push(`👤 المعلم: *${teacherName}*`)`
    lines.push(`🆔 الكود: ${teacherCode}`)
    lines.push(`📅 الفترة: ${monthLabel}`)
    lines.push(`────────────────`)
    lines.push(`✅ إجمالي الحصص: *${totalSessions}*`)
    lines.push(`💰 المستحق: *${totalPay.toLocaleString('ar-EG')} ج*`)
    lines.push(`────────────────`)

    for (const g of groups) {
      const sub = g.sessions.length * g.price
      lines.push(``)
      lines.push(`👦 ${g.name} (${g.code})`)
      lines.push(`   ${g.sessions.length} حصة × ${g.price} ج = *${sub.toLocaleString('ar-EG')} ج*`)
      const dates = g.sessions.map((s) => s.date).slice(0, 20)
      if (dates.length) {
        lines.push(`   📆 ${dates.join(' · ')}${g.sessions.length > 20 ? ' …' : ''}`)
      }
    }

    lines.push(``)
    lines.push(`────────────────`)
    lines.push(`📌 الإجمالي النهائي: *${totalPay.toLocaleString('ar-EG')} جنيه*`)
    lines.push(`جزاكم الله خيرًا 🌿`)
    return lines.join('\n')
  }, [teacherName, teacherCode, monthLabel, totalSessions, totalPay, groups])

  // Fix template string - rebuild cleanly without syntax errors
  const text = useMemo(() => {
    const L: string[] = []
    L.push('🌿 *أكاديمية أشبال الإسلام*')
    L.push('📋 *تفاصيل راتب المعلم*')
    L.push('')
    L.push(`👤 المعلم: *${teacherName}*`)
    L.push(`🆔 الكود: ${teacherCode}`)
    L.push(`📅 الفترة: ${monthLabel}`)
    L.push('────────────────')
    L.push(`✅ إجمالي الحصص: *${totalSessions}*`)
    L.push(`💰 المستحق: *${totalPay.toLocaleString('ar-EG')} ج*`)
    L.push('────────────────')
    for (const g of groups) {
      const sub = g.sessions.length * g.price
      L.push('')
      L.push(`👦 ${g.name} (${g.code})`)
      L.push(`   ${g.sessions.length} حصة × ${g.price} ج = *${sub.toLocaleString('ar-EG')} ج*`)
      const dates = g.sessions.map((s) => s.date).slice(0, 15)
      if (dates.length) L.push(`   📆 ${dates.join(' · ')}${g.sessions.length > 15 ? ' …' : ''}`)
    }
    L.push('')
    L.push('────────────────')
    L.push(`📌 الإجمالي النهائي: *${totalPay.toLocaleString('ar-EG')} جنيه*`)
    L.push('جزاكم الله خيرًا 🌿')
    return L.join('\n')
  }, [teacherName, teacherCode, monthLabel, totalSessions, totalPay, groups])

  function copyText() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function printPdf() {
    window.print()
  }

  return (
    <div className="px-4 mb-4 space-y-2 print:hidden">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={openWhatsApp}
          className="py-3 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-1"
          style={{ background: '#25D366' }}
        >
          <span className="material-symbols-outlined text-[18px]">chat</span>
          واتساب
        </button>
        <button
          type="button"
          onClick={printPdf}
          className="py-3 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-1"
          style={{ background: '#176b52' }}
        >
          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
          PDF / طباعة
        </button>
      </div>
      <button
        type="button"
        onClick={copyText}
        className="w-full py-2.5 rounded-2xl font-bold text-[12px] bg-white"
        style={{ border: '1px solid #cde8dc', color: '#176b52' }}
      >
        {copied ? '✓ تم نسخ الرسالة' : 'نسخ نص الرسالة'}
      </button>
      <details className="card p-3">
        <summary className="text-[12px] font-bold cursor-pointer" style={{ color: '#00513c' }}>
          معاينة رسالة الواتساب
        </summary>
        <pre className="mt-2 text-[11px] whitespace-pre-wrap leading-relaxed" style={{ color: '#3f4944' }}>
          {text}
        </pre>
      </details>
    </div>
  )
}
