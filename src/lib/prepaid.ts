/** دفع مقدم — الطالب مش بيظهر في المستحقات طول ما الفترة مغطّاة */

export function endOfMonth(year: number, month1to12: number): string {
  const last = new Date(year, month1to12, 0).getDate()
  return `${year}-${String(month1to12).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

/**
 * من تاريخ الدفع + عدد الشهور (يشمل شهر الدفع).
 * مثال: دفع 2026-11-05 لشهرين → يغطي نوفمبر وديسمبر → prepaid_until = 2026-12-31
 * يظهر كمستحق من يناير 2027.
 */
export function computePrepaidUntil(paymentDate: string, months: number): string {
  const n = Math.max(1, Math.min(24, Math.floor(Number(months) || 1)))
  const y = Number(String(paymentDate).slice(0, 4))
  const m = Number(String(paymentDate).slice(5, 7))
  if (!y || !m) {
    const d = new Date()
    return endOfMonth(d.getFullYear(), d.getMonth() + 1)
  }
  const total = m + n - 1
  const ey = y + Math.floor((total - 1) / 12)
  const em = ((total - 1) % 12) + 1
  return endOfMonth(ey, em)
}

/** هل الشهر الحالي/المختار ما زال مغطى بالدفع المقدم؟ */
export function isPrepaidCoveringMonth(
  prepaidUntil: string | null | undefined,
  monthKey: string
): boolean {
  if (!prepaidUntil) return false
  const until = String(prepaidUntil).slice(0, 10)
  const start = `${monthKey}-01`
  // مغطى طالما prepaid_until >= أول يوم في الشهر
  return until >= start
}

export function prepaidLabel(prepaidUntil: string | null | undefined): string {
  if (!prepaidUntil) return ''
  const u = String(prepaidUntil).slice(0, 10)
  return `مقدّم حتى ${u}`
}
