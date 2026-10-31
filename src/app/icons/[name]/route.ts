import { NextRequest, NextResponse } from 'next/server'
import { ICON_192, ICON_512, ICON_180, LOGO_256 } from '@/lib/icons-data'

const MAP: Record<string, string> = {
  'icon-192.png': ICON_192,
  'icon-512.png': ICON_512,
  'apple-touch-icon.png': ICON_180,
  'logo.png': LOGO_256,
  'icon-48.png': ICON_192,
  'icon-72.png': ICON_192,
  'icon-96.png': ICON_192,
  'icon-128.png': ICON_192,
  'icon-144.png': ICON_192,
  'icon-152.png': ICON_192,
  'icon-180.png': ICON_180,
  'icon-256.png': ICON_512,
  'icon-384.png': ICON_512,
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const b64 = MAP[name]
  if (!b64) return new NextResponse('Not found', { status: 404 })
  const buf = Buffer.from(b64, 'base64')
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
