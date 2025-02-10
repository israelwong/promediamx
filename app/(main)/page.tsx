import type { Metadata } from "next";
import Principal from "./_components/Principal";

export const metadata: Metadata = {
  title: 'Bienvenido | ProMedia',
  description: 'Comercialización Digital y Producción de Medios Audiovisuales.',
  metadataBase: new URL('https://promedia.mx'),
  openGraph: {
    title: 'Bienvenido | ProMedia',
    description: 'Comercialización Digital y Producción de Medios Audiovisuales.',
    url: 'https://promedia.mx',
    siteName: 'ProMedia',
    images: [
      {
        url: 'https://promedia.mx/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ProMedia',
      },
    ],
    locale: 'es_MX',
    type: 'website',
  }
};

export default function Home() {
  return (
    <div className="mx-auto max-w-screen-xl px-4">
      <Principal />
    </div >
  );
}
