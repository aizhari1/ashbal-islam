export type Gender = 'male' | 'female'
export type TemplateKey = 'gold' | 'emerald' | 'royal' | 'rose' | 'medal' | 'kids' | 'boys' | 'girls' | 'men' | 'women'

export type CertificateData = {
  template: TemplateKey
  gender: Gender
  title: string
  studentName: string
  teacherName: string
  memorized: string
  progress: string
  message: string
  issueDate: string // YYYY-MM-DD
  signer: string
}

export const TEMPLATES: { key: TemplateKey; name: string; desc: string; gender?: Gender }[] = [
  { key: 'boys', name: 'الأشبال (أولاد)', desc: 'للأولاد الصغار · أزرق مرح', gender: 'male' },
  { key: 'girls', name: 'الزهرات (بنات)', desc: 'للبنات الصغيرات · وردي مرح', gender: 'female' },
  { key: 'men', name: 'الرجال', desc: 'أخضر وذهبي وقور', gender: 'male' },
  { key: 'women', name: 'السيدات', desc: 'ورود هادئة بالوردي', gender: 'female' },
  { key: 'gold', name: 'ذهبي كلاسيك', desc: 'إطار مزخرف بالذهبي على ورق عاجي' },
  { key: 'emerald', name: 'أخضر قرآني', desc: 'نجمة إسلامية وإطار ذهبي على الأخضر' },
  { key: 'royal', name: 'أزرق ملكي', desc: 'شريط عنوان وأوسمة بالأزرق' },
  { key: 'rose', name: 'وردي هادئ', desc: 'زخارف زهور ناعمة (مناسب للبنات)' },
  { key: 'medal', name: 'ميدالية التفوّق', desc: 'وسام دائري بأكاليل الغار' },
  { key: 'kids', name: 'أشبال المرح', desc: 'ألوان وفرحة للصغار' },
]

export const DEFAULT_TITLE = 'شهادة تقدير'
export const DEFAULT_SIGNER = 'إدارة الأكاديمية'
export const BRAND = 'أكاديمية أشبال الإسلام'

export function subtitleFor(g: Gender) {
  return g === 'female' ? 'تُمنح هذه الشهادة إلى الطالبة' : 'تُمنح هذه الشهادة إلى الطالب'
}

export function defaultMessage(g: Gender) {
  return g === 'female'
    ? 'تقديرًا لجهدها المتميّز وحرصها على حفظ كتاب الله تعالى والتزامها وتفوّقها، نسأل الله أن يبارك فيها وينفع بها.'
    : 'تقديرًا لجهده المتميّز وحرصه على حفظ كتاب الله تعالى والتزامه وتفوّقه، نسأل الله أن يبارك فيه وينفع به.'
}

export function fmtArabicDate(d: string) {
  const s = String(d || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const [y, m, day] = s.split('-').map(Number)
  return `${day} ${months[m - 1]} ${y}`
}

/** رسالة واتساب للطالب/ولي الأمر مع رابط الشهادة */
export function whatsappMessage(o: { studentName: string; gender: Gender; url: string }) {
  const who = o.gender === 'female' ? 'الطالبة' : 'الطالب'
  const pron = o.gender === 'female' ? 'وزادها علمًا ونفع بها' : 'وزاده علمًا ونفع به'
  return [
    'السلام عليكم ورحمة الله وبركاته 🌹',
    '',
    `يسرّنا إهداء ${who} ${o.studentName} شهادة تقدير من ${BRAND} 🏅`,
    '',
    `رابط الشهادة: ${o.url}`,
    '',
    `بارك الله فيه${o.gender === 'female' ? 'ا' : ''} ${pron} 🤲`.replace('فيهه', 'فيه'),
  ].join('\n')
}
