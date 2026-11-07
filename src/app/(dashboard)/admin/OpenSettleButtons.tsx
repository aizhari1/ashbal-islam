/** أزرار بدون onClick — form GET يشتغل حتى لو الـ JS/React متعطل */
export function OpenSettleButtons() {
  return (
    <div className="px-4 mb-3 space-y-2 relative z-20">
      <form action="/admin/session-settle" method="get">
        <button
          type="submit"
          className="block w-full rounded-2xl px-4 py-4 text-center font-bold text-[15px] text-white"
          style={{ background: '#ba1a1a', border: 'none', cursor: 'pointer' }}
        >
          تسوية حصص المعلم (بحث · حذف · مزامنة)
        </button>
      </form>
      <form action="/admin/payroll" method="get">
        <button
          type="submit"
          className="block w-full rounded-2xl px-4 py-4 text-center font-bold text-[15px] text-white"
          style={{ background: '#755b1b', border: 'none', cursor: 'pointer' }}
        >
          مسير الرواتب · تسوية / صرف المعلمين
        </button>
      </form>
      <p className="text-center text-[11px]" style={{ color: '#6f7974' }}>
        لو الزرار واقف انسخ الرابط: /admin/session-settle أو /admin/payroll
      </p>
    </div>
  )
}
