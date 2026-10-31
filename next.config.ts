import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr"],
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  poweredByHeader: false,
  compress: true,
  images: { unoptimized: true },
  rewrites: async () => [
    { source: '/logo.png', destination: '/icons/logo.png' },
    { source: '/apple-touch-icon.png', destination: '/icons/apple-touch-icon.png' },
    { source: '/favicon.ico', destination: '/icons/icon-192.png' },
  ],
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
};

export default nextConfig;
