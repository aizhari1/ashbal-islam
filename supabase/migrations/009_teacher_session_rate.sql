-- 009 — سعر حصة المعلم منفصل عن سعر الحصة على ولي الأمر
-- price_per_session = سعر الحصة على ولي الأمر (بيتحسب منه مبلغ الباقة والمستحقات)
-- teacher_session_rate = اللي بيتحسب منه راتب المعلم لكل حصة حاضر/متأخر
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_session_rate NUMERIC(12,2);

-- الطلاب الحاليين: نثبّت الراتب على نفس القيمة اللي كان بيتحسب بيها (سعر الحصة بحد أدنى 25)
-- فمفيش راتب يتغيّر بعد الترقية، ولو اتعدّل سعر الباقة بعد كده الراتب مايتأثرش.
UPDATE students
   SET teacher_session_rate = GREATEST(25, price_per_session)
 WHERE teacher_session_rate IS NULL
   AND price_per_session IS NOT NULL
   AND price_per_session > 0;
