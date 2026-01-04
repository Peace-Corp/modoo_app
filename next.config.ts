import type { NextConfig } from "next";

// Check if building for Capacitor (static export)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  // Enable static export only for Capacitor builds
  ...(isCapacitorBuild && {
    output: 'export',
    trailingSlash: true,
  }),

  images: {
    // Disable image optimization for static export (required for Capacitor)
    unoptimized: isCapacitorBuild,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'obxekwyolrmipwmffhwq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
