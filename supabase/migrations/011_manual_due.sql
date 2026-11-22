-- مستحق يدوي منفصل: بيتجمع مع المستحق المحسوب من الحصص ومبيتصفّرش بالمزامنة
alter table public.students
  add column if not exists manual_due numeric not null default 0;
