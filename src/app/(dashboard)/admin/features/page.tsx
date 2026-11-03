import FeaturesPicker from '@/components/FeaturesPicker'

const ADMIN_FEATURES = [
  { href: '/admin/student-hub', icon: 'person_search', title: 'بحث طالب وإجراء', desc: 'بحث · اختيار · عملية' },
  { href: '/admin/courses', icon: 'school', title: 'الكورسات', desc: 'فيديوهات · اشتراكات' },
  { href: '/admin/landing', icon: 'web', title: 'اللاندنج بيدج', desc: 'الصفحة الرئيسية' },
  { href: '/admin/monthly', icon: 'calendar_view_month', title: 'الملخص الشهري', desc: 'دخل · صرف · حصص' },
  { href: '/admin/sessions-detail', icon: 'list_alt', title: 'تفاصيل الحصص', desc: 'معلم · طلاب · سعر' },
  { href: '/admin/payments', icon: 'credit_card', title: 'المدفوعات', desc: 'إنستا · فودافون · بنكي' },
  { href: '/admin/activity', icon: 'history', title: 'سجل النشاط', desc: 'تايم لاين' },
  { href: '/admin/edit-session', icon: 'edit_note', title: 'تعديل رقم الحصة', desc: 'آخر حصة' },
  { href: '/admin/trials', icon: 'science', title: 'الحصص التجريبية', desc: 'طلاب محتملون' },
  { href: '/admin/teacher-absences', icon: 'event_busy', title: 'غيابات المعلمين', desc: 'من الإشراف' },
  { href: '/admin/analytics', icon: 'bar_chart', title: 'تحليلات الباقات', desc: 'أكثر وأقل باقة' },
  { href: '/admin/notes', icon: 'sticky_note_2', title: 'الملاحظات', desc: 'إدارة وإشراف' },
  { href: '/admin/chat', icon: 'chat', title: 'شات المعلمين', desc: 'محادثة' },
  { href: '/admin/students', icon: 'groups', title: 'شؤون الطلاب', desc: 'سجلات' },
  { href: '/admin/students/new', icon: 'person_add', title: 'طالب جديد', desc: 'تسجيل' },
  { href: '/admin/reports', icon: 'analytics', title: 'التقارير', desc: 'ملخص' },
  { href: '/admin/evaluations', icon: 'rate_review', title: 'التقييمات', desc: 'أولياء + إدارة' },
  { href: '/admin/finance', icon: 'payments', title: 'التذكير المالي', desc: 'مستحقات' },
  { href: '/admin/payroll', icon: 'account_balance_wallet', title: 'مسير الرواتب', desc: 'حصص × سعر' },
  { href: '/admin/cashbox', icon: 'savings', title: 'الصندوق', desc: 'دخل وصرف' },
  { href: '/admin/schedule', icon: 'calendar_month', title: 'الجدول', desc: 'مواعيد' },
  { href: '/admin/fixed-schedule', icon: 'event_repeat', title: 'المواعيد الثابتة', desc: 'جدول ثابت' },
  { href: '/admin/families', icon: 'family_restroom', title: 'العائلات', desc: 'أولياء' },
  { href: '/admin/supervisors', icon: 'supervisor_account', title: 'المشرفون', desc: 'إدارة' },
  { href: '/admin/teacher-eval', icon: 'star', title: 'تقييم المعلمين', desc: 'من الإدارة' },
  { href: '/admin/supervisor-eval', icon: 'verified', title: 'تقييم الإشراف', desc: 'من الإدارة' },
  { href: '/admin/subscriptions-log', icon: 'receipt_long', title: 'سجل الاشتراكات', desc: 'مدفوعات' },
  { href: '/admin/users', icon: 'manage_accounts', title: 'إدارة المستخدمين', desc: 'أدوار' },
  { href: '/admin/packages', icon: 'inventory_2', title: 'باقات الاشتراك', desc: 'تعريف' },
  { href: '/admin/transfer', icon: 'swap_horiz', title: 'نقل طالب', desc: 'بين معلمين' },
  { href: '/teacher/session', icon: 'mic', title: 'غرفة التسميع', desc: 'حضور' },
  { href: '/student', icon: 'school', title: 'بوابة الطالب', desc: 'بالكود' },
  { href: '/evaluate', icon: 'family_restroom', title: 'فورم أولياء الأمور', desc: 'تقييم' },
]

export default function AdminFeaturesPage() {
  return <FeaturesPicker role="admin" items={ADMIN_FEATURES} backHref="/admin/more" title="مميزات الإدارة الظاهرة" />
}
