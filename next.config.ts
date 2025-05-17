const nextConfig:
  import('next').NextConfig = {
  images: {
    domains:
      ['sfsjdyuwttrcgchbsxim.supabase.co'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;