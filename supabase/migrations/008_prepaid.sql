-- دفع مقدم: تاريخ نهاية التغطية
ALTER TABLE students ADD COLUMN IF NOT EXISTS prepaid_until DATE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS prepaid_months INT;

CREATE INDEX IF NOT EXISTS idx_students_prepaid_until ON students (prepaid_until)
  WHERE prepaid_until IS NOT NULL;
