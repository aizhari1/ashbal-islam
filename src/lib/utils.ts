type ClassValue = string | number | null | false | undefined | ClassValue[]

/** دمج أسماء الكلاسات (بدون مكتبات خارجية — clsx/tailwind-merge مش متثبتة) */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const walk = (v: ClassValue) => {
    if (Array.isArray(v)) v.forEach(walk)
    else if (v) out.push(String(v))
  }
  inputs.forEach(walk)
  return out.join(' ')
}

/** مبالغ بأرقام إنجليزية */
export function formatCurrency(amount: number, currency = 'EGP') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** تاريخ بأسماء شهور عربية + أرقام إنجليزية */
export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'latn',
  }).format(d)
}

export const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
