# موعظة ونور | أشبال الإسلام

Next.js 16 + React 19 + TypeScript + Supabase + Tailwind

## تشغيل

```bash
npm install
cp .env.example .env.local
# املأ مفاتيح Supabase
npm run dev
```

## النشر على Vercel

اربط المشروع وأضف Environment Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

ثم نفّذ migrations في Supabase SQL Editor.
