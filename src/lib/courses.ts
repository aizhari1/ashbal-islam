import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'

export type LandingContent = {
  brand: string
  heroBadge: string
  heroTitle: string
  heroHighlight: string
  heroSub: string
  ctaPrimary: string
  ctaSecondary: string
  whatsapp: string
  heroImage: string
  statsMode: 'auto' | 'manual'
  stats: { value: number; suffix: string; label: string }[]
  featuresTitle: string
  features: { icon: string; title: string; desc: string }[]
  coursesTitle: string
  coursesSub: string
  stepsTitle: string
  steps: { title: string; desc: string }[]
  faqTitle: string
  faq: { q: string; a: string }[]
  footer: string
}

export const DEFAULT_LANDING: LandingContent = {
  brand: 'أكاديمية أشبال الإسلام',
  heroBadge: 'تحفيظ القرآن الكريم أونلاين',
  heroTitle: 'ابنِ علاقة',
  heroHighlight: 'حقيقية مع كتاب الله',
  heroSub: 'حلقات فردية مع معلمين مُجازين، متابعة يومية، وتقارير واضحة لولي الأمر — من بيتك وبمواعيدك.',
  ctaPrimary: 'احجز حصة تجريبية',
  ctaSecondary: 'شاهد الكورسات',
  whatsapp: '',
  heroImage: '',
  statsMode: 'auto',
  stats: [],
  featuresTitle: 'لماذا أشبال الإسلام؟',
  features: [
    { icon: 'person', title: 'حلقات فردية', desc: 'معلم لكل طالب لمتابعة دقيقة ومناسبة لمستواه.' },
    { icon: 'workspace_premium', title: 'معلمون مُجازون', desc: 'نخبة من أهل الإتقان والخبرة في تعليم الصغار والكبار.' },
    { icon: 'monitoring', title: 'تقارير ومتابعة', desc: 'تقييم بعد كل حصة وتقرير شهري يصل لولي الأمر.' },
    { icon: 'schedule', title: 'مواعيد مرنة', desc: 'اختر الوقت المناسب لك ولأسرتك على مدار اليوم.' },
  ],
  coursesTitle: 'كورساتنا',
  coursesSub: 'اشترك في الكورس، وبعد تفعيل الإدارة يظهر لك في بوابة الطالب بكودك.',
  stepsTitle: 'ابدأ في 3 خطوات',
  steps: [
    { title: 'سجّل بياناتك', desc: 'اضغط اشتراك واكتب اسمك ورقم واتساب.' },
    { title: 'تأكيد الاشتراك', desc: 'تتواصل معك الإدارة وتفعّل الكورس لك.' },
    { title: 'ابدأ التعلّم', desc: 'ادخل بوابة الطالب بكودك وشاهد الدروس.' },
  ],
  faqTitle: 'أسئلة شائعة',
  faq: [
    { q: 'إزاي أشوف الكورس بعد الاشتراك؟', a: 'بعد تفعيل الإدارة، ادخل بوابة الطالب بكودك وهتلاقي الكورس في قسم كورساتي.' },
    { q: 'هل الفيديوهات متاحة لأي حد؟', a: 'لا، الدروس تظهر فقط للطلاب المفعّل اشتراكهم.' },
  ],
  footer: 'جميع الحقوق محفوظة © أكاديمية أشبال الإسلام',
}

export async function getLandingContent(): Promise<LandingContent> {
  try {
    const { data } = await serviceClient().from('settings').select('value').eq('key', 'landing_content').maybeSingle()
    if (data?.value) return { ...DEFAULT_LANDING, ...JSON.parse(data.value) }
  } catch {}
  return DEFAULT_LANDING
}

export async function requireAdmin(): Promise<{ ok: boolean; userId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'غير مصرح' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (String(profile?.role) !== 'admin') return { ok: false, error: 'للإدارة فقط' }
  return { ok: true, userId: user.id }
}

/** يحوّل رابط يوتيوب/فيميو لرابط embed، وإلا يرجّع null */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const h = u.hostname.replace('www.', '')
    if (h === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (h === 'youtube.com') {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      if (u.pathname.startsWith('/embed/')) return url
    }
    if (h === 'vimeo.com') return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean)[0]}`
  } catch {}
  return null
}

export function slugify(s: string) {
  const base = s.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  return base || 'course'
}

/** أرقام حقيقية من قاعدة البيانات (تظهر لما statsMode = auto) */
export async function getLiveStats(): Promise<LandingContent['stats']> {
  try {
    const sb = serviceClient()
    const [st, te, at] = await Promise.all([
      sb.from('students').select('id', { count: 'exact', head: true }).eq('status', 'نشط'),
      sb.from('teachers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      sb.from('attendance').select('id', { count: 'exact', head: true }),
    ])
    const out: LandingContent['stats'] = []
    if (st.count) out.push({ value: st.count, suffix: '', label: 'طالب وطالبة' })
    if (te.count) out.push({ value: te.count, suffix: '', label: 'معلم ومعلمة' })
    if (at.count) out.push({ value: at.count, suffix: '', label: 'حصة مسجّلة' })
    return out
  } catch { return [] }
}
