import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
