/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sfsjdyuwttrcgchbsxim.supabase.co',
        pathname: '/storage/v1/object/public/ProMedia/**',
      },
      {
        protocol: 'https',
        hostname: 'bgtapcutchryzhzooony.supabase.co',
        pathname: '/storage/v1/object/public/ProMedia/**',
      },
    ],
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;