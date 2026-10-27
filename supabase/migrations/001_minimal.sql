-- أشبال الإسلام — Schema أساسي
-- نفّذ هذا في Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'teacher', 'parent', 'student');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE student_status AS ENUM ('نشط', 'موقوف', 'منسحب', 'تجريبي', 'مؤجل');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('حاضر', 'غائب', 'متأخر', 'معذور', 'تجريبي');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'teacher',
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_id UUID REFERENCES profiles(id),
  rate_percent NUMERIC(5,2) DEFAULT 50,
  max_capacity INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  sessions_count INT NOT NULL,
  duration_minutes INT DEFAULT 30,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id),
  parent_id UUID REFERENCES profiles(id),
  status student_status DEFAULT 'نشط',
  subscription_type TEXT,
  session_duration INT DEFAULT 30,
  age INT,
  country TEXT,
  email TEXT,
  phone TEXT,
  amount_due NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  price_per_session NUMERIC(12,2) DEFAULT 60,
  join_date DATE,
  last_session_num INT DEFAULT 0,
  last_session_date DATE,
  monthly_sessions INT DEFAULT 4,
  notes TEXT,
  package_id UUID REFERENCES packages(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  session_date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'حاضر',
  session_num INT,
  hifz_from TEXT,
  hifz_to TEXT,
  muraja_from TEXT,
  muraja_to TEXT,
  tajweed_notes TEXT,
  rating INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  status TEXT DEFAULT 'مدفوع',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  teacher_id UUID REFERENCES teachers(id),
  day_of_week INT,
  start_time TIME,
  duration_minutes INT DEFAULT 30,
  session_date DATE,
  status TEXT DEFAULT 'مجدول',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(session_date);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_teachers" ON teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_students" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_packages" ON packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_attendance" ON attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_schedule" ON schedule_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_activity" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_packages" ON packages FOR SELECT TO anon USING (true);
