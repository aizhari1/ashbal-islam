export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center" style={{ background: '#ffffff' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={96} height={96} style={{ objectFit: 'contain' }} />
      <p className="mt-3 text-[13px] font-semibold" style={{ color: '#0B6B3A' }}>جاري التحميل…</p>
    </div>
  )
}
