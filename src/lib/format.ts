/** أرقام إنجليزية دائمًا للحساب والعرض الموحّد */
export function fmtNum(n: number | string | null | undefined, fractionDigits = 0): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits > 0 ? undefined : 0,
  })
}

/** تاريخ بأرقام إنجليزية مع أسماء شهور عربية عند الحاجة */
export function fmtDate(d: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ar-EG', { numberingSystem: 'latn', ...opts })
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ar-EG', { numberingSystem: 'latn' })
}
