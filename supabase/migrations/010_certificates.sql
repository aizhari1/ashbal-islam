-- 010 — شهادات التقدير (قوالب متعددة)
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  student_name text not null,
  teacher_name text,
  gender text not null default 'male' check (gender in ('male','female')),
  template text not null default 'gold',
  title text not null default 'شهادة تقدير',
  memorized text,
  progress text,
  message text,
  issue_date date not null default ((now() at time zone 'Africa/Cairo')::date),
  signer text,
  issued_by uuid,
  sent_at timestamptz,
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_certificates_student on certificates(student_id, created_at desc);
create index if not exists idx_certificates_created on certificates(created_at desc);
alter table certificates enable row level security;
