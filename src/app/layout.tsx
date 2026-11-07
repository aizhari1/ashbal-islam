import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@/lib/force-latin-digits'
import { SessionRestorer } from '@/components/SessionRestorer'
import { InstallAshbal } from '@/components/InstallAshbal'
import { ThemeToggle, THEME_INIT_SCRIPT } from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'أكاديمية أشبال الإسلام',
  description: 'نظام إدارة أكاديمية أشبال الإسلام — تحفيظ القرآن الكريم',
  applicationName: 'أشبال الإسلام',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/jpeg' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/jpeg' }],
  },
  appleWebApp: {
    capable: true,
    title: 'أشبال الإسلام',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#176b52' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1a15' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var o = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function(locales, options) {
      var loc = Array.isArray(locales) ? locales[0] : locales;
      if (!loc || String(loc).toLowerCase().indexOf('ar') === 0) {
        return o.call(this, 'en-US', options);
      }
      return o.call(this, locales, options);
    };
  } catch (e) {}
})();
`,
          }}
        />
        <link rel="preconnect" href="https://bmemllsjduxlqmwnpfya.supabase.co" />
        <link rel="dns-prefetch" href="https://bmemllsjduxlqmwnpfya.supabase.co" />
        <link rel="icon" href="/icons/icon-192.png" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SessionRestorer />
        <ThemeToggle />
        {children}
        <InstallAshbal />
      </body>
    </html>
  )
}
