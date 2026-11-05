-- إيصال اختياري للدفعات + تخزين
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Storage bucket يُنشأ من لوحة Supabase أو أول رفع
-- اسم الـ bucket: payment-receipts (عام للقراءة)
