-- 005 — نظام الكورسات + لاندنج بيدج قابلة للتعديل
-- إضافات فقط (additive): لا حذف ولا تعديل لأي جدول موجود.
-- ⚠️ خذ نسخة احتياطية قبل التنفيذ. ينفَّذ مرة واحدة في Supabase → SQL Editor (آمن لإعادة التشغيل).

-- 1) الكورسات
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  short_desc TEXT,
  description TEXT,
  cover_url TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  instructor TEXT,
  duration_label TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,   -- يظهر في اللاندنج بيدج
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) الدروس (فيديو / صورة / ملف / رابط خارجي)
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'video' CHECK (kind IN ('video','image','file','link')),
  storage_path TEXT,      -- مسار الملف في bucket اسمه course-media (خاص)
  external_url TEXT,      -- يوتيوب / فيميو / أي رابط
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id, position);

-- 3) الاشتراكات: طلب (pending) → تفعيل من الإدارة (active) → إيقاف (suspended)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,  -- فاضي لو الطلب من زائر لسه مش طالب
  guest_name TEXT,
  guest_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enroll_student ON course_enrollments(course_id, student_id) WHERE student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_enroll_guest ON course_enrollments(course_id, guest_phone) WHERE student_id IS NULL AND guest_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enroll_student ON course_enrollments(student_id, status);

-- 4) الأمان: RLS مفعّل بدون policies → الوصول يتم فقط من السيرفر (service role) بعد فحص الصلاحية
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- 5) Buckets: landing-media عام (صور اللاندنج وأغلفة الكورسات) / course-media خاص (فيديوهات وصور الدروس)
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-media', 'landing-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('course-media', 'course-media', false) ON CONFLICT (id) DO NOTHING;

-- محتوى اللاندنج بيتخزن في جدول settings الموجود (key = 'landing_content') — مفيش جدول جديد.
