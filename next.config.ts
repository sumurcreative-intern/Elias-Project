import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  allowedDevOrigins: ['192.168.107.1'],
  images: {
    // YouTube thumbnails in the Elias analysis card
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com' }],
  },
};

export default nextConfig;
