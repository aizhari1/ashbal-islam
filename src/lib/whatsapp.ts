/**
 * يرجّع رقم واتساب دولي صالح أو '' لو الرقم مش صالح.
 * أرقام النظام القديم جاية بصيغ كتير: 010xxxxxxxx / 10 xxxxxxxx (من غير الصفر) / +966... / #ERROR!
 */
export function normalizePhone(phone: string | null | undefined): string {
  let p = String(phone || '').replace(/[^\d+]/g, '')
  if (!p) return ''
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0') && p.length >= 10) p = '20' + p.slice(1)
  else if (!p.startsWith('20') && p.length <= 11) p = '20' + p // رقم مصري من غير الصفر/الكود
  return p.length >= 11 && p.length <= 15 ? p : ''
}

/** رابط واتساب برقم مُطبَّع، أو بدون رقم (يختار المرسِل الشخص) لو الرقم مش صالح */
export function waLink(phone: string | null | undefined, text: string) {
  const p = normalizePhone(phone)
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
}
