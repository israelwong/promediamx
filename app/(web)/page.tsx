import type { Metadata } from "next";
// import Hero from "@/app/ui/main/home/Hero";
import Multimedia from "./_components/Multimedia";
// import HookServicios from "./ui/main/home/HookServicios";
import Marketing from "./_components/Marketing";
import Websites from "./_components/Websites";
import Pasarela from "./_components/Pasarela";
import LogosClientes from "./_components/LogosClientes";

export const metadata: Metadata = {
  title: 'Bienvenido | ProMedia',
  description: 'Comercialización Digital y Producción de Medios Audiovisuales.',
  metadataBase: new URL('https://promedia.mx'),
};

export default function Home() {
  return (
    <div className="mx-auto">
      {/* <section>
        <Hero />
      </section> */}

      {/* <section>
        <div className="mt-16 mb-8">
        <HookServicios />
        </div>
      </section> */}

      <section>
        <Multimedia />
      </section>

      <section>
        <Marketing />
      </section>

      <section>
        <Websites />
      </section>

      <section>
        <Pasarela />
      </section>

      <section className="mt-10">
        <LogosClientes />
      </section>

    </div>
  );
}
