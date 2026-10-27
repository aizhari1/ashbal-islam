export default function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: '#eefdf6' }}>
      <div className="text-center">
        <div className="w-10 h-10 mx-auto rounded-full border-4 animate-spin" style={{ borderColor: '#176b52', borderTopColor: 'transparent' }} />
        <p className="text-[13px] mt-3" style={{ color: '#6f7974' }}>جاري التحميل...</p>
      </div>
    </div>
  )
}
