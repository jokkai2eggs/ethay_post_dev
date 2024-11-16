import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  missingSuspenseWithCSRBailout: false,
  images: {
    domains: ['ipfs.io'],
  },
}

export default nextConfig
