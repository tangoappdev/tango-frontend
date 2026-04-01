/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/tangoapp-8bd65-storage/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/tangoapp-8bd65-storage/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.hoy-milonga.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'agendadeltango.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tango-argentin.fr',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.tango-argentin.fr',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
