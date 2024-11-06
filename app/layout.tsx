import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProMedia",
  description: "Presencia digital para tu negocio",
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
        {children}
      </body>
    </html>
  );
}
