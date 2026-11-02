/** منطق المستحق الموحّد بين الإدارة والمعلم */

export function packageSize(s: {
  subscription_type?: string | null
  monthly_sessions?: number | null
}): number {
  const n = Number(s.monthly_sessions)
  if (n > 0) return n
  const m = String(s.subscription_type || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

export function packagePrice(s: {
  subscription_type?: string | null
  monthly_sessions?: number | null
  price_per_session?: number | null
  amount_due?: number | null
}): number {
  const pkg = packageSize(s)
  const rate = Number(s.price_per_session) > 0 ? Number(s.price_per_session) : 25
  if (pkg > 0) return pkg * rate
  // fallback: لو مفيش باقة واضحة استخدم المستحق الحالي إن وجد
  return Number(s.amount_due || 0)
}

/** بعد اكتمال الباقة: يظهر المستحق = سعر الباقة */
export function dueAfterPackageComplete(student: {
  subscription_type?: string | null
  monthly_sessions?: number | null
  price_per_session?: number | null
  amount_due?: number | null
}): number {
  const price = packagePrice(student)
  return price > 0 ? price : Number(student.amount_due || 0)
}

/** بعد دفعة: المستحق ينقص بالمبلغ (حد أدنى 0) */
export function dueAfterPayment(currentDue: number, paidAmount: number): number {
  return Math.max(0, Number(currentDue || 0) - Number(paidAmount || 0))
}

/** هل وصل عداد الحصص لنهاية الباقة؟ */
export function isPackageComplete(
  lastSessionNum: number,
  student: { subscription_type?: string | null; monthly_sessions?: number | null }
): boolean {
  const pkg = packageSize(student)
  if (pkg <= 0) return false
  return lastSessionNum > 0 && lastSessionNum % pkg === 0
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function previousMonthKey(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}
