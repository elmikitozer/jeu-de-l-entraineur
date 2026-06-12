/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
  async redirects() {
    return [
      // Anciennes URLs (singulier) → nouvelles routes plurielles
      { source: '/player/:id', destination: '/players/:id', permanent: true },
      { source: '/team/:id', destination: '/equipes/:id', permanent: true },
    ]
  },
}

export default nextConfig
