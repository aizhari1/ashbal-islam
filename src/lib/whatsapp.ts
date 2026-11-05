/** رابط واتساب لرقم محلي/دولي (0xxxxxxxxxx → 20xxxxxxxxxx زي القديم) */
export function waLink(phone: string | null | undefined, text: string) {
  let p = String(phone || '').replace(/[^\d+]/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0') && p.length >= 10) p = '20' + p.slice(1)
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`
}
