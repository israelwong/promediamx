import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from "next";
import Navbar from "./_components/Navbar";
import Footer from "./_components/Footer";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | ProMedia',
    default: 'Bienvenido | ProMedia',
  },
  description: 'Comercialización Digital y Producción de Medios Audiovisuales.',
  metadataBase: new URL('https://promedia.mx'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html lang="en">
      <head>
        <link
          rel="icon"
          href="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/favicon_fullcolor.svg"
          type="image/<generated>"
          sizes="<generated>"
        />
      </head>
      <body className={'antialiased'}>
        <Navbar />
        {children}
        <Footer />
        <GoogleTagManager gtmId="GTM-M9ZT7HQ9" />
      </body>
    </html>
  );
}
