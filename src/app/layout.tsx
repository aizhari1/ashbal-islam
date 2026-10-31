import type { Metadata, Viewport } from 'next'
import './globals.css'
import AppBoot from '@/components/AppBoot'

export const metadata: Metadata = {
  title: 'أكاديمية أشبال الإسلام',
  description: 'نظام إدارة أكاديمية أشبال الإسلام — تحفيظ القرآن الكريم',
  manifest: '/manifest.webmanifest',
  applicationName: 'أشبال الإسلام',
  appleWebApp: {
    capable: true,
    title: 'أشبال الإسلام',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/jpeg' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/jpeg' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/jpeg' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0B6B3A',
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://bmemllsjduxlqmwnpfya.supabase.co" />
        <link rel="dns-prefetch" href="https://bmemllsjduxlqmwnpfya.supabase.co" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="أشبال الإسلام" />
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
        <AppBoot />
        {children}
      </body>
    </html>
  )
}
