/** تفضيلات ظهور المميزات لكل دور — تُحفظ على الجهاز */

export type DashRole = 'admin' | 'supervisor' | 'teacher'

export type FeatureItem = {
  id: string
  href: string
  icon: string
  title: string
  desc?: string
  color?: string
}

const STORAGE_PREFIX = 'ashbal_features_'

export function featureIdFromHref(href: string): string {
  const path = href.split('?')[0]
  return path.replace(/^\//, '').replace(/\//g, '_') || 'home'
}

export function loadFeaturePrefs(role: DashRole): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + role)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveFeaturePrefs(role: DashRole, prefs: Record<string, boolean>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_PREFIX + role, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function isFeatureVisible(role: DashRole, id: string, prefs?: Record<string, boolean>): boolean {
  const p = prefs ?? loadFeaturePrefs(role)
  // غير موجود = ظاهر افتراضيًا
  if (p[id] === undefined) return true
  return p[id] !== false
}

export function filterVisibleFeatures(role: DashRole, items: FeatureItem[]): FeatureItem[] {
  const prefs = loadFeaturePrefs(role)
  return items.filter((i) => isFeatureVisible(role, i.id, prefs))
}
