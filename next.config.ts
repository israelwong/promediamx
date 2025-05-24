const nextConfig:
  import('next').NextConfig = {
  // images: {
  //   domains:
  //     ['sfsjdyuwttrcgchbsxim.supabase.co'],
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sfsjdyuwttrcgchbsxim.supabase.co",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;