CREATE TABLE IF NOT EXISTS finance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('إيراد', 'مصروف')),
  category TEXT,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EGP',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_type TEXT NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  evaluator_name TEXT,
  phone TEXT,
  month_label TEXT,
  answers JSONB,
  score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supervisor_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  salary NUMERIC(12,2) DEFAULT 0,
  paid NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE finance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_finance" ON finance_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_evals" ON evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_evals" ON evaluations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all_sup_pay" ON supervisor_payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);
