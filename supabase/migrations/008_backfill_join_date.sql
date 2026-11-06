-- ملء تاريخ الانضمام للطلاب القدامى من created_at لو فاضي
UPDATE students
SET join_date = (created_at AT TIME ZONE 'Africa/Cairo')::date
WHERE join_date IS NULL
  AND created_at IS NOT NULL;
