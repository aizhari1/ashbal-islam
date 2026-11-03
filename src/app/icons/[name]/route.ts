import { NextRequest, NextResponse } from 'next/server'

/** الشعار الرسمي — مصدر واحد لكل أيقونات التطبيق */
const LOGO_URL =
  'https://bmemllsjduxlqmwnpfya.supabase.co/storage/v1/object/public/brand/logo.jpg'

let cached: ArrayBuffer | null = null
let cachedAt = 0
const CACHE_MS = 1000 * 60 * 60 * 6 // 6 ساعات

async function getLogoBytes(): Promise<ArrayBuffer> {
  const now = Date.now()
  if (cached && now - cachedAt < CACHE_MS) return cached
  const res = await fetch(LOGO_URL, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('logo fetch failed')
  const buf = await res.arrayBuffer()
  cached = buf
  cachedAt = now
  return buf
}

const KNOWN = new Set([
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png',
  'logo.png',
  'logo.jpg',
  'icon-48.png',
  'icon-72.png',
  'icon-96.png',
  'icon-128.png',
  'icon-144.png',
  'icon-152.png',
  'icon-180.png',
  'icon-256.png',
  'icon-384.png',
  'favicon.ico',
])

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  if (!KNOWN.has(name)) {
    return new NextResponse('Not found', { status: 404 })
  }
  try {
    const buf = await getLogoBytes()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse('Logo unavailable', { status: 502 })
  }
}
