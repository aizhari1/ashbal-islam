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
export function computePrepaidUntil(
  paymentDate: string,
  months: number,
  existingUntil?: string | null
): string {
  const n = Math.max(1, Math.min(24, Math.floor(Number(months) || 1)))
  let y = Number(String(paymentDate).slice(0, 4))
  let m = Number(String(paymentDate).slice(5, 7))
  if (!y || !m) {
    const d = new Date()
    return endOfMonth(d.getFullYear(), d.getMonth() + 1)
  }
  // لو الطالب لسه مغطّى بدفع مقدم قديم يوصل لشهر الدفع أو بعده: التمديد يبدأ من الشهر اللي بعد آخر تغطية
  // (قبل كده الدفعة الجديدة كانت بتكتب فوق التغطية القديمة وبتضيّع شهور مدفوعة)
  const ex = String(existingUntil || '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ex) && ex >= `${y}-${String(m).padStart(2, '0')}-01`) {
    const ey0 = Number(ex.slice(0, 4))
    const em0 = Number(ex.slice(5, 7))
    // الشهر اللي بعد آخر شهر مغطّى؛ و"شهر الدفع" الافتراضي بيتحسب منه
    y = em0 === 12 ? ey0 + 1 : ey0
    m = em0 === 12 ? 1 : em0 + 1
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
