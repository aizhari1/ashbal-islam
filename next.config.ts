import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr"],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
