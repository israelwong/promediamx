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
        hostname: "eeyewyhlfquhdgplcmcn.supabase.co",
        port: '', // Dejar vacío si es el puerto estándar (443 para https)
        pathname: '/storage/v1/object/public/ProMedia/**', // Permite cualquier imagen dentro de tu bucket ProMedia
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