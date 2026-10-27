'use client'
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="text-[13px] font-bold text-[#176b52] px-2">
      طباعة
    </button>
  )
}
