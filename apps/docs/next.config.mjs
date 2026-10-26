import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Emits .next/standalone for the Docker image in apps/docs/Dockerfile.
  output: 'standalone',
  // The docs moved from /docs to the root of their subdomain; old links still
  // land. Two rules: `/docs/:path*` sends /docs itself to an empty Location.
  async redirects() {
    return [
      { source: '/docs', destination: '/', permanent: true },
      { source: '/docs/:path+', destination: '/:path+', permanent: true },
    ]
  },
}

export default withMDX(config)
