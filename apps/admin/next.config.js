/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost', port: '4000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '4000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '116.203.215.86', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '116.203.215.86', port: '4000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'bigbites.pk', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '*.bigbites.pk', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'bigbites.pk', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '*.bigbites.pk', pathname: '/uploads/**' },
    ],
  },
};
module.exports = nextConfig;
