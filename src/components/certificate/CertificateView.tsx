'use client'

import { useEffect, useRef, useState, forwardRef } from 'react'
import type { CertificateData, TemplateKey } from '@/lib/certificates'
import { BRAND, fmtArabicDate, subtitleFor } from '@/lib/certificates'

export const CERT_W = 1100
export const CERT_H = 778

type Theme = { bg: string; title: string; name: string; text: string; label: string; boxBg: string; boxBorder: string; line: string; fontTitle: string }

const THEMES: Record<TemplateKey, Theme> = {
  gold: { bg: '#fffaf0', title: '#8a5a12', name: '#6b4208', text: '#3d2b0a', label: '#a97a21', boxBg: 'rgba(212,172,90,.12)', boxBorder: '#d4ac5a', line: '#b8893b', fontTitle: "'Reem Kufi', serif" },
  emerald: { bg: '#073d30', title: '#f1d58a', name: '#ffffff', text: '#e9f5ef', label: '#f1d58a', boxBg: 'rgba(255,255,255,.08)', boxBorder: '#d4b25c', line: '#d4b25c', fontTitle: "'Reem Kufi', serif" },
  royal: { bg: '#f6f9ff', title: '#ffffff', name: '#14357a', text: '#1b2a4a', label: '#1d4ed8', boxBg: 'rgba(29,78,216,.07)', boxBorder: '#93b0ee', line: '#1d4ed8', fontTitle: "'Reem Kufi', serif" },
  rose: { bg: '#fff3f6', title: '#a63d62', name: '#8a2c4d', text: '#4a2231', label: '#c2557b', boxBg: 'rgba(226,120,155,.10)', boxBorder: '#eaa3bb', line: '#d9748f', fontTitle: "'Aref Ruqaa', serif" },
  medal: { bg: '#fdfcf6', title: '#1f5c47', name: '#17493a', text: '#26332e', label: '#b4862c', boxBg: 'rgba(31,92,71,.06)', boxBorder: '#b4862c', line: '#1f5c47', fontTitle: "'Reem Kufi', serif" },
  kids: { bg: '#fff8e1', title: '#e4572e', name: '#2b59c3', text: '#3b3b3b', label: '#e4572e', boxBg: 'rgba(255,255,255,.75)', boxBorder: '#ffb703', line: '#fb8500', fontTitle: "'Aref Ruqaa', serif" },
}

function Corner({ color, size = 90, flip = '' }: { color: string; size?: number; flip?: string }) {
  return (
    <g transform={flip}>
      <path d={`M0 ${size} Q0 0 ${size} 0`} fill="none" stroke={color} strokeWidth="5" />
      <path d={`M14 ${size - 10} Q14 14 ${size - 10} 14`} fill="none" stroke={color} strokeWidth="2" />
      <circle cx="26" cy="26" r="7" fill={color} />
      <path d={`M${size + 6} 0 l10 -6 l10 6 l-10 6z`} fill={color} />
      <path d={`M0 ${size + 6} l-6 10 l6 10 l6 -10z`} fill={color} />
    </g>
  )
}

function Star8({ cx, cy, r, fill, opacity = 1 }: { cx: number; cy: number; r: number; fill: string; opacity?: number }) {
  const a = r, b = r * 0.72
  return (
    <g transform={`translate(${cx} ${cy})`} opacity={opacity}>
      <rect x={-a} y={-a} width={a * 2} height={a * 2} fill={fill} />
      <rect x={-b} y={-b} width={b * 2} height={b * 2} fill={fill} transform="rotate(45)" />
    </g>
  )
}

function Decor({ t }: { t: TemplateKey }) {
  const w = CERT_W, h = CERT_H
  if (t === 'gold')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9c46a" /><stop offset="1" stopColor="#a8761f" /></linearGradient>
        </defs>
        <rect x="22" y="22" width={w - 44} height={h - 44} fill="none" stroke="url(#g1)" strokeWidth="8" />
        <rect x="40" y="40" width={w - 80} height={h - 80} fill="none" stroke="#d4ac5a" strokeWidth="2" />
        <g transform="translate(40 40)"><Corner color="#b8893b" /></g>
        <g transform={`translate(${w - 40} 40) scale(-1 1)`}><Corner color="#b8893b" /></g>
        <g transform={`translate(40 ${h - 40}) scale(1 -1)`}><Corner color="#b8893b" /></g>
        <g transform={`translate(${w - 40} ${h - 40}) scale(-1 -1)`}><Corner color="#b8893b" /></g>
        <Star8 cx={w / 2} cy={46} r={14} fill="#b8893b" />
        <Star8 cx={w / 2} cy={h - 46} r={10} fill="#b8893b" />
        <circle cx={w / 2} cy={h / 2} r="250" fill="none" stroke="#d4ac5a" strokeOpacity=".14" strokeWidth="26" />
      </svg>
    )
  if (t === 'emerald')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="e1" cx=".5" cy=".5" r=".75"><stop offset="0" stopColor="#0d5a47" /><stop offset="1" stopColor="#052d24" /></radialGradient>
          <pattern id="stars" width="70" height="70" patternUnits="userSpaceOnUse">
            <rect width="70" height="70" fill="none" />
            <g transform="translate(35 35)" fill="none" stroke="#d4b25c" strokeOpacity=".22" strokeWidth="1.4">
              <rect x="-14" y="-14" width="28" height="28" /><rect x="-14" y="-14" width="28" height="28" transform="rotate(45)" />
            </g>
          </pattern>
        </defs>
        <rect width={w} height={h} fill="url(#e1)" />
        <rect width={w} height={h} fill="url(#stars)" />
        <rect x="28" y="28" width={w - 56} height={h - 56} fill="none" stroke="#d4b25c" strokeWidth="5" />
        <rect x="46" y="46" width={w - 92} height={h - 92} fill="none" stroke="#d4b25c" strokeOpacity=".6" strokeWidth="1.5" />
        {[[28, 28], [w - 28, 28], [28, h - 28], [w - 28, h - 28]].map(([x, y], i) => <Star8 key={i} cx={x} cy={y} r={16} fill="#d4b25c" />)}
        <Star8 cx={w / 2} cy={h / 2 - 10} r={230} fill="#d4b25c" opacity={0.05} />
        <path d={`M${w / 2 - 120} 36 h240`} stroke="#d4b25c" strokeWidth="3" />
      </svg>
    )
  if (t === 'royal')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="r1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0b2a6f" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
          <linearGradient id="r2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1e40af" /><stop offset="1" stopColor="#3b82f6" /></linearGradient>
        </defs>
        <rect x="0" y="0" width="64" height={h} fill="url(#r2)" />
        <rect x={w - 64} y="0" width="64" height={h} fill="url(#r2)" />
        <rect x="64" y="22" width={w - 128} height={h - 44} fill="none" stroke="#1d4ed8" strokeWidth="2" />
        {/* شريط العنوان */}
        <polygon points={`150,78 ${w - 150},78 ${w - 120},128 ${w - 150},178 150,178 120,128`} fill="url(#r1)" />
        <polygon points={`150,178 132,196 150,196`} fill="#0b2a6f" />
        <polygon points={`${w - 150},178 ${w - 132},196 ${w - 150},196`} fill="#0b2a6f" />
        {[0, 1, 2, 3, 4].map((i) => <Star8 key={i} cx={100 + i * 0} cy={110 + i * 0} r={0} fill="#fff" />)}
        {[200, 330, 770, 900].map((x, i) => <Star8 key={i} cx={x} cy={128} r={8} fill="#fde68a" />)}
        {[110, 220, 330, 440, 550, 660, 770].map((y, i) => (
          <g key={i}><Star8 cx={32} cy={y} r={7} fill="#fff" opacity={0.55} /><Star8 cx={w - 32} cy={y} r={7} fill="#fff" opacity={0.55} /></g>
        ))}
      </svg>
    )
  if (t === 'rose')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <rect x="26" y="26" width={w - 52} height={h - 52} rx="44" fill="none" stroke="#e48aa5" strokeWidth="6" />
        <rect x="44" y="44" width={w - 88} height={h - 88} rx="32" fill="none" stroke="#f1b5c8" strokeWidth="2.5" strokeDasharray="10 8" />
        {[[70, 70, 1, 1], [w - 70, 70, -1, 1], [70, h - 70, 1, -1], [w - 70, h - 70, -1, -1]].map(([x, y, sx, sy], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
            {[0, 60, 120, 180, 240, 300].map((r) => <ellipse key={r} cx="0" cy="-26" rx="13" ry="26" fill="#f4a3bd" opacity=".85" transform={`rotate(${r})`} />)}
            <circle r="13" fill="#fde68a" />
            <ellipse cx="62" cy="14" rx="22" ry="9" fill="#9ad3b4" transform="rotate(25 62 14)" />
            <ellipse cx="18" cy="64" rx="22" ry="9" fill="#9ad3b4" transform="rotate(70 18 64)" />
          </g>
        ))}
        <g transform={`translate(${w / 2} 44)`}>
          {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-9" rx="6" ry="11" fill="#f4a3bd" transform={`rotate(${r})`} />)}
          <circle r="5" fill="#fde68a" />
        </g>
      </svg>
    )
  if (t === 'medal')
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <radialGradient id="m1" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#f6dc8e" /><stop offset="1" stopColor="#b4862c" /></radialGradient>
        </defs>
        <rect x="26" y="26" width={w - 52} height={h - 52} rx="14" fill="none" stroke="#1f5c47" strokeWidth="5" />
        <rect x="42" y="42" width={w - 84} height={h - 84} rx="8" fill="none" stroke="#b4862c" strokeWidth="1.8" />
        {/* شرائط الميدالية */}
        <polygon points={`${w / 2 - 34},76 ${w / 2 - 6},76 ${w / 2 - 28},160 ${w / 2 - 62},140`} fill="#1f5c47" />
        <polygon points={`${w / 2 + 34},76 ${w / 2 + 6},76 ${w / 2 + 28},160 ${w / 2 + 62},140`} fill="#2a7a5e" />
        {/* أكاليل الغار */}
        {[-1, 1].map((d) => (
          <g key={d} transform={`translate(${w / 2} 128) scale(${d} 1)`}>
            {Array.from({ length: 9 }).map((_, i) => {
              const a = (-100 + i * 22) * (Math.PI / 180)
              return <ellipse key={i} cx={Math.cos(a) * 92 + 14} cy={Math.sin(a) * 92 * -1 + 14} rx="7" ry="15" fill="#6ca98d" transform={`rotate(${-90 + i * 22} ${Math.cos(a) * 92 + 14} ${Math.sin(a) * 92 * -1 + 14})`} opacity=".9" />
            })}
          </g>
        ))}
        <circle cx={w / 2} cy={128} r="62" fill="url(#m1)" stroke="#8f6a1c" strokeWidth="4" />
        <circle cx={w / 2} cy={128} r="48" fill="none" stroke="#fff6d6" strokeOpacity=".8" strokeWidth="2" />
        <Star8 cx={w / 2} cy={128} r={24} fill="#fff6d6" />
      </svg>
    )
  // kids
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
      <rect x="22" y="22" width={w - 44} height={h - 44} rx="40" fill="none" stroke="#fb8500" strokeWidth="10" />
      <rect x="22" y="22" width={w - 44} height={h - 44} rx="40" fill="none" stroke="#ffb703" strokeWidth="10" strokeDasharray="36 28" />
      <rect x="44" y="44" width={w - 88} height={h - 88} rx="26" fill="none" stroke="#8ecae6" strokeWidth="3" />
      {[[110, 120, '#ef476f', 12], [w - 120, 140, '#06d6a0', 14], [150, h - 130, '#118ab2', 11], [w - 150, h - 110, '#ffd166', 13], [330, 70, '#06d6a0', 8], [w - 330, 78, '#ef476f', 9], [90, 400, '#ffd166', 9], [w - 90, 420, '#118ab2', 9]].map(([x, y, c, r], i) => (
        <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={c as string} opacity=".9" />
      ))}
      {[[200, 190, '#ffb703'], [w - 210, 210, '#ef476f'], [180, h - 210, '#06d6a0'], [w - 190, h - 200, '#118ab2']].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${i * 18})`}>
          <polygon points="0,-20 6,-6 20,-6 9,3 13,18 0,9 -13,18 -9,3 -20,-6 -6,-6" fill={c as string} />
        </g>
      ))}
      <path d={`M${w / 2 - 70} 50 q70 -34 140 0`} fill="none" stroke="#fb8500" strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

const Seal = ({ color }: { color: string }) => (
  <svg width="96" height="96" viewBox="-48 -48 96 96">
    <circle r="44" fill="none" stroke={color} strokeWidth="3" />
    <circle r="36" fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="3 4" />
    <rect x="-17" y="-17" width="34" height="34" fill={color} opacity=".9" />
    <rect x="-17" y="-17" width="34" height="34" fill={color} opacity=".9" transform="rotate(45)" />
    <circle r="9" fill="#fff" opacity=".9" />
  </svg>
)

/** الشهادة بمقاس ثابت 1100×778 — بتتحجّم بـ ScaledCertificate */
export const CertificateCard = forwardRef<HTMLDivElement, { data: CertificateData }>(function CertificateCard({ data }, ref) {
  const th = THEMES[data.template] || THEMES.gold
  const date = fmtArabicDate(data.issueDate)
  const nameSize = data.studentName.length > 24 ? 54 : data.studentName.length > 16 ? 64 : 76
  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ width: CERT_W, height: CERT_H, position: 'relative', background: th.bg, color: th.text, fontFamily: "'Amiri', 'IBM Plex Sans Arabic', serif", overflow: 'hidden', flexShrink: 0 }}
    >
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap" precedence="default" />
      <Decor t={data.template} />

      <div style={{ position: 'absolute', inset: 0, textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: data.template === 'royal' ? 92 : data.template === 'medal' ? 206 : 80, width: '100%', fontFamily: th.fontTitle, fontWeight: 700, fontSize: data.template === 'royal' ? 66 : 62, color: th.title, letterSpacing: 1 }}>
          {data.title || 'شهادة تقدير'}
        </div>
        <div style={{ position: 'absolute', top: data.template === 'medal' ? 290 : 196, width: '100%', fontSize: 28, color: th.label, fontWeight: 700 }}>{subtitleFor(data.gender)}</div>
        <div style={{ position: 'absolute', top: data.template === 'medal' ? 322 : 232, width: '100%', fontFamily: "'Aref Ruqaa', serif", fontWeight: 700, fontSize: nameSize, color: th.name, lineHeight: 1.25 }}>
          {data.studentName || 'اسم الطالب'}
        </div>
        <div style={{ position: 'absolute', top: data.template === 'medal' ? 410 : 326, left: '50%', transform: 'translateX(-50%)', width: 520, height: 3, background: `linear-gradient(90deg, transparent, ${th.line}, transparent)` }} />
        <div style={{ position: 'absolute', top: data.template === 'medal' ? 424 : 344, left: 130, right: 130, fontSize: 27, lineHeight: 1.55, color: th.text }}>{data.message}</div>

        <div style={{ position: 'absolute', top: 474, left: 110, right: 110, display: 'flex', gap: 22, justifyContent: 'center' }}>
          {[['المحفوظ', data.memorized], ['التقدّم', data.progress]].map(([l, v]) =>
            v ? (
              <div key={l} style={{ flex: 1, background: th.boxBg, border: `2px solid ${th.boxBorder}`, borderRadius: 18, padding: '10px 16px', minHeight: 92 }}>
                <div style={{ fontSize: 22, color: th.label, fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: 26, lineHeight: 1.35, color: th.text, fontWeight: 700 }}>{v}</div>
              </div>
            ) : null
          )}
        </div>

        <div style={{ position: 'absolute', top: 606, left: 100, right: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ width: 280 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: th.text, minHeight: 36 }}>{data.teacherName}</div>
            <div style={{ height: 2, background: th.line, margin: '4px 18px' }} />
            <div style={{ fontSize: 20, color: th.label }}>المعلّم</div>
          </div>
          <div style={{ width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Seal color={th.line} />
          </div>
          <div style={{ width: 280 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: th.text, minHeight: 36 }}>{data.signer}</div>
            <div style={{ height: 2, background: th.line, margin: '4px 18px' }} />
            <div style={{ fontSize: 20, color: th.label }}>{date ? `التاريخ: ${date}` : 'الإدارة'}</div>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: data.template === 'royal' ? 40 : 52, width: '100%', fontSize: 20, color: th.label, fontWeight: 700 }}>{BRAND}</div>
      </div>
    </div>
  )
})

/** بيحجّم الشهادة على عرض الشاشة */
export function ScaledCertificate({ data, maxWidth }: { data: CertificateData; maxWidth?: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.35)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const calc = () => setScale(Math.min(maxWidth ?? Infinity, el.clientWidth) / CERT_W)
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxWidth])
  return (
    <div ref={wrap} style={{ width: '100%', height: CERT_H * scale, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, transform: `scale(${scale})`, transformOrigin: 'top right' }}>
        <CertificateCard data={data} />
      </div>
    </div>
  )
}
