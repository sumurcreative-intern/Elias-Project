import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  allowedDevOrigins: ['192.168.107.1'],
};

export default nextConfig;
