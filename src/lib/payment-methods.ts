/** توحيد أسماء طرق الدفع */
export const PAYMENT_METHODS = [
  { id: 'انستا_باي', label: 'إنستا باي', aliases: ['انستا', 'انستاباي', 'instapay', 'insta', 'إنستا باي', 'انستا باي'] },
  { id: 'فودافون_كاش', label: 'فودافون كاش', aliases: ['فودافون', 'كاش', 'vodafone', 'vf cash', 'فودافون كاش'] },
  { id: 'تحويل_بنكي', label: 'تحويل بنكي', aliases: ['تحويل', 'بنك', 'بنكي', 'bank', 'transfer', 'تحويل بنكي'] },
  { id: 'اخرى', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other', 'نقدي', 'كاش يد'] },
] as const

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id']

export function normalizeMethod(raw: string | null | undefined): PaymentMethodId {
  if (!raw) return 'تحويل_بنكي'
  const s = String(raw).trim().toLowerCase()
  for (const m of PAYMENT_METHODS) {
    if (m.id === raw || m.label === raw) return m.id
    if (m.aliases.some((a) => s.includes(a.toLowerCase()) || a.toLowerCase() === s)) return m.id
  }
  return 'اخرى'
}

export function methodLabel(raw: string | null | undefined): string {
  const id = normalizeMethod(raw)
  return PAYMENT_METHODS.find((m) => m.id === id)?.label || 'أخرى'
}

export function methodColor(raw: string | null | undefined): string {
  const id = normalizeMethod(raw)
  if (id === 'انستا_باي') return '#7c3aed'
  if (id === 'فودافون_كاش') return '#e11d48'
  if (id === 'تحويل_بنكي') return '#176b52'
  return '#6f7974'
}
