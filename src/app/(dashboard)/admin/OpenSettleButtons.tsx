'use client'

/** أزرار تفتح بـ location.assign عشان متتعطلش في الـ WebView أو Next soft nav */
export function OpenSettleButtons() {
  return (
    <div className="px-4 mb-3 space-y-2">
      <button
        type="button"
        onClick={() => {
          window.location.assign('/admin/session-settle')
        }}
        className="block w-full rounded-2xl px-4 py-3.5 text-center font-bold text-[14px] text-white"
        style={{ background: '#ba1a1a' }}
      >
        تسوية حصص المعلم (بحث · حذف · مزامنة)
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.assign('/admin/payroll')
        }}
        className="block w-full rounded-2xl px-4 py-3.5 text-center font-bold text-[14px] text-white"
        style={{ background: '#755b1b' }}
      >
        مسير الرواتب · تسوية / صرف المعلمين
      </button>
    </div>
  )
}
