/** رفع سكرين شوت الدفع — اختياري */
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'payment-receipts'

export async function uploadPaymentReceipt(
  supabase: SupabaseClient,
  file: File | null | undefined,
  studentId: string
): Promise<{ url?: string; error?: string }> {
  if (!file || !file.size) return {}
  // حد أقصى 5 ميجا
  if (file.size > 5 * 1024 * 1024) return { error: 'حجم الصورة كبير (الحد 5 ميجا)' }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${studentId}/${Date.now()}.${ext}`

  // تأكد من وجود الـ bucket (يتجاهل لو موجود)
  try {
    await supabase.storage.createBucket(BUCKET, { public: true })
  } catch {
    /* موجود أو صلاحيات */
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (error) {
    // لو الـ bucket مش موجود ومش قادر ينشئه — منكمّل بدون صورة
    console.error('receipt upload', error.message)
    return { error: `تعذّر رفع الصورة: ${error.message}` }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data?.publicUrl }
}
