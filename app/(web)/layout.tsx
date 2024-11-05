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
      <body className={'antialiased'}>
        <Navbar />
        {children}
        <Footer />
        <GoogleTagManager gtmId="GTM-M9ZT7HQ9" />
      </body>
    </html>
  );
}
