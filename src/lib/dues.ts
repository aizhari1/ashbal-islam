/** منطق المستحق الموحّد بين الإدارة والإشراف */

export function packageSize(s: {
  subscription_type?: string | null
  monthly_sessions?: number | null
}): number {
  const n = Number(s.monthly_sessions)
  if (n > 0) return n
  const m = String(s.subscription_type || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

/**
 * رقم الحصة التالية داخل الباقة.
 * باقة 4: بعد 4 يرجع يعد من 1 (مش 5).
 */
export function nextPackageSessionNum(
  prevNum: number,
  quota: number
): { next: number; completedPackage: boolean } {
  const prev = Math.max(0, Number(prevNum) || 0)
  const q = Math.max(0, Number(quota) || 0)
  if (q <= 0) {
    return { next: prev + 1, completedPackage: false }
  }
  // خلّص الباقة أو تجاوزها → دورة جديدة من الصفر
  const base = prev >= q ? 0 : prev
  const next = base + 1
  return { next, completedPackage: next === q }
}

/** عرض رقم الحصة داخل الباقة (1..q) حتى لو last_session_num قديم أكبر من q */
export function displaySessionInPackage(lastNum: number, quota: number): number {
  const n = Math.max(0, Number(lastNum) || 0)
  const q = Math.max(0, Number(quota) || 0)
  if (q <= 0) return n
  if (n <= 0) return 0
  const mod = n % q
  return mod === 0 ? q : mod
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
  return Number(s.amount_due || 0)
}

export function dueAfterPackageComplete(student: {
  subscription_type?: string | null
  monthly_sessions?: number | null
  price_per_session?: number | null
  amount_due?: number | null
}): number {
  const price = packagePrice(student)
  return price > 0 ? price : Number(student.amount_due || 0)
}

export function dueAfterPayment(currentDue: number, paidAmount: number): number {
  return Math.max(0, Number(currentDue || 0) - Number(paidAmount || 0))
}

export function isPackageComplete(
  lastSessionNum: number,
  student: { subscription_type?: string | null; monthly_sessions?: number | null }
): boolean {
  const pkg = packageSize(student)
  if (pkg <= 0) return false
  const n = Math.max(0, Number(lastSessionNum) || 0)
  if (n <= 0) return false
  return n % pkg === 0
}

export const APP_TIME_ZONE = 'Africa/Cairo'

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const AR_MONTHS = [
  '',
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayKey(d = new Date()): string {
  return dayFormatter.format(d)
}

export function currentMonthKey(d = new Date()): string {
  return todayKey(d).slice(0, 7)
}

export function previousMonthKey(d = new Date()): string {
  const [y, m] = currentMonthKey(d).split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${pad2(m - 1)}`
}

export function isMonthKey(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}$/.test(s)) return false
  const m = Number(s.slice(5))
  return m >= 1 && m <= 12
}

export function resolveMonthKey(s?: string | null): string {
  return isMonthKey(s) ? s : currentMonthKey()
}

export function monthBounds(key: string): { start: string; end: string } {
  const [y, m] = key.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start: `${key}-01`, end: `${key}-${pad2(last)}` }
}

export function monthLabelAr(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${AR_MONTHS[m] || key} ${y}`
}
