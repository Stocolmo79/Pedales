import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.S3_PUBLIC_HOSTNAME ?? "images.carolinsdotter.se",
        pathname: "/**",
      },
      // Old Supabase Storage images, until scripts/migrate-images-to-r2.mjs has been run.
      ...(process.env.SUPABASE_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.SUPABASE_URL).hostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
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
