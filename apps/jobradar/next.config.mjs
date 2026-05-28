/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@umanex/ui', '@umanex/tokens'],
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

export default nextConfig
