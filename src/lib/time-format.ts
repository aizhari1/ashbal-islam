/** تنسيق الوقت بنظام 12 ساعة (ص/م) — كل الواجهات */

export function formatTime12(t?: string | null): string {
  if (t == null || t === '') return '—'
  const raw = String(t).trim()
  // يدعم HH:mm أو HH:mm:ss أو ISO
  const m = raw.match(/(\d{1,2}):(\d{2})/)
  if (!m) return raw
  let h = Number(m[1])
  const min = m[2]
  if (Number.isNaN(h) || h < 0 || h > 23) return raw.slice(0, 5)
  const period = h >= 12 ? 'م' : 'ص'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${min} ${period}`
}

/** للعرض جنب التاريخ */
export function formatDateTime12(date?: string | null, time?: string | null): string {
  const d = date ? String(date).slice(0, 10) : ''
  const tm = formatTime12(time)
  if (d && tm !== '—') return `${d} · ${tm}`
  return d || tm
}
