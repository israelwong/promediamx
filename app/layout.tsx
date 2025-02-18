import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | ProMedia',
    default: 'Bienvenido',
  },
  description: 'Marketing Digital y Producción de Medios Audiovisuales.',
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
      <Script src="https://kit.fontawesome.com/74d1405387.js"></Script>
      <body className={'antialiased'}>
        {children}
        <GoogleTagManager gtmId="GTM-M9ZT7HQ9" />
      </body>
    </html>
  );
}
