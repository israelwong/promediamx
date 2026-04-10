import type { Metadata } from "next";
import Principal from "./_components/Principal";

export const metadata: Metadata = {
  title: "Agencia de Marketing Digital en México | Agencia de Marketing Digital en México",
  description: "Agencia de Marketing Digital en México especializada en la creación de contenido para redes sociales, diseño de imagen de marca y embudos de ventas.",
  keywords: "agencia de marketing digital en México, agencia de marketing digital, creación de contenido para redes sociales, diseño de imagen de marca, embudos de ventas",
};

export default function Home() {
  return (
    <div className="mx-auto max-w-screen-xl px-4">
      <Principal />
    </div >
  );
}
