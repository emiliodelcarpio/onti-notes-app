import type { NextConfig } from "next";
import { getPublicSupabaseConfig } from './lib/supabase/config';

// Fail before producing browser assets if a privileged key or insecure origin
// was accidentally configured as a public environment variable.
getPublicSupabaseConfig();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      ],
    }]
  },
  experimental: {
    // Allow the 2 MiB avatar plus multipart form overhead. Actions validate the file itself.
    serverActions: { bodySizeLimit: '3mb' },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
