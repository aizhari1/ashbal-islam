# شعار التطبيق

الصورة الرسمية لأكاديمية **أشبال الإسلام** (كتاب + شمس).

## المصدر
- ملف المستخدم: `IMG-20260923-WA0016.jpg`
- نسخة عامة: https://bmemllsjduxlqmwnpfya.supabase.co/storage/v1/object/public/brand/logo.jpg

## Workflow `Build APK`
1. يسحب الشعار
2. يضع `public/logo.jpg` في المستودع (commit تلقائي)
3. يولّد أيقونات Android `ic_launcher` لو مجلد `android/` موجود
4. يرفع Artifact: `ashbal-app-icons`

شغّل من: GitHub → Actions → **Build APK** → Run workflow
