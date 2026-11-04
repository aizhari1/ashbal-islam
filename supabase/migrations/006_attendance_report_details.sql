-- 006 — تفاصيل تقرير الحصة (مطابقة أشبال القديم): درجات من 10 + الحفظ/الماضي + مدة الحلقة الفعلية
-- إضافات فقط (nullable) — آمنة وبتتنفّذ قبل نشر الكود. بتتعمل مرة واحدة (IF NOT EXISTS).
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_duration SMALLINT CHECK (session_duration BETWEEN 5 AND 300);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS score_new SMALLINT CHECK (score_new BETWEEN 0 AND 10);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS score_recent SMALLINT CHECK (score_recent BETWEEN 0 AND 10);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS score_far SMALLINT CHECK (score_far BETWEEN 0 AND 10);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS new_memorization TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS recent_past TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS far_past TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS arabic_lang TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS tarbiya_note TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS sharii_note TEXT;
