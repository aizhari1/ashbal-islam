-- 004 — سلامة الدفعات والمستحقات
ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_before NUMERIC(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS due_after NUMERIC(12,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_idempotency_key
  ON payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_student_date ON payments (student_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance (student_id, session_date);

CREATE OR REPLACE FUNCTION record_payment(
  p_student_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'EGP',
  p_method TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_payment_date DATE DEFAULT CURRENT_DATE,
  p_clear_due BOOLEAN DEFAULT FALSE,
  p_idempotency_key TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'admin'
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_prev NUMERIC;
  v_next NUMERIC;
  v_id UUID;
  v_existing payments%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'duplicate', TRUE, 'payment_id', v_existing.id,
        'prev_due', COALESCE(v_existing.due_before, 0), 'new_due', COALESCE(v_existing.due_after, 0)
      );
    END IF;
  END IF;

  SELECT COALESCE(amount_due, 0) INTO v_prev FROM students WHERE id = p_student_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM payments WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'duplicate', TRUE, 'payment_id', v_existing.id,
        'prev_due', COALESCE(v_existing.due_before, 0), 'new_due', COALESCE(v_existing.due_after, 0)
      );
    END IF;
  END IF;

  v_next := CASE WHEN p_clear_due THEN 0 ELSE GREATEST(0, v_prev - p_amount) END;

  INSERT INTO payments (
    student_id, amount, currency, status, payment_date, method, notes,
    idempotency_key, due_before, due_after, recorded_by
  ) VALUES (
    p_student_id, p_amount, COALESCE(p_currency, 'EGP'), 'مدفوع', COALESCE(p_payment_date, CURRENT_DATE),
    p_method, p_notes, p_idempotency_key, v_prev, v_next, auth.uid()
  ) RETURNING id INTO v_id;

  UPDATE students SET amount_due = v_next WHERE id = p_student_id;

  INSERT INTO activity_log (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    CASE WHEN p_source = 'supervisor' THEN 'supervisor_payment' ELSE 'record_payment' END,
    'payment',
    v_id::TEXT,
    jsonb_build_object(
      'student_id', p_student_id, 'amount', p_amount, 'method', p_method,
      'payment_date', COALESCE(p_payment_date, CURRENT_DATE),
      'prev_due', v_prev, 'new_due', v_next, 'partial', (v_next > 0)
    )
  );

  RETURN jsonb_build_object('duplicate', FALSE, 'payment_id', v_id, 'prev_due', v_prev, 'new_due', v_next);
END;
$$;

GRANT EXECUTE ON FUNCTION record_payment(UUID, NUMERIC, TEXT, TEXT, TEXT, DATE, BOOLEAN, TEXT, TEXT) TO authenticated;
