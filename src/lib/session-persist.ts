/** حفظ الجلسة محليًا حتى يضغط المستخدم تسجيل خروج فقط */

export const SESSION_BACKUP_KEY = 'ashbal_session_v1'
export const ROLE_BACKUP_KEY = 'ashbal_role_v1'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // سنة

export type SessionBackup = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user_id?: string
}

export function saveSessionBackup(session: {
  access_token: string
  refresh_token: string
  expires_at?: number
  user?: { id?: string } | null
} | null) {
  if (typeof window === 'undefined') return
  try {
    if (!session?.access_token || !session?.refresh_token) return
    const payload: SessionBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user_id: session.user?.id,
    }
    localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(payload))
  } catch {
    /* private mode */
  }
}

export function loadSessionBackup(): SessionBackup | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_BACKUP_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as SessionBackup
    if (!p?.access_token || !p?.refresh_token) return null
    return p
  } catch {
    return null
  }
}

export function clearSessionBackup() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(SESSION_BACKUP_KEY)
    localStorage.removeItem(ROLE_BACKUP_KEY)
  } catch {
    /* ignore */
  }
  try {
    document.cookie = 'ashbal_role=; path=/; max-age=0; SameSite=Lax'
  } catch {
    /* ignore */
  }
}

export function saveRoleBackup(role: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ROLE_BACKUP_KEY, role)
    document.cookie =
      'ashbal_role=' + role + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax'
  } catch {
    /* ignore */
  }
}

export function loadRoleBackup(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(ROLE_BACKUP_KEY)
  } catch {
    return null
  }
}
