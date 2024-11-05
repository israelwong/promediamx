import Link from "next/link";
import type { Metadata } from "next";
import { Rocket, Video, Camera } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Servicios',
  description: 'Comerciaización digital, marketing digital, sitios web, landing pages, fotografía y video',
  metadataBase: new URL('https://promedia.mx/servicios'),
};

function page() {
  return (
    <div>

      <div className="bg-gradient-to-b from-black to-zinc-950 h-screen">

        <section className="mx-auto mb-12 pt-10 text-center">
          <h3 className="uppercase md:text-5xl text-4xl pb-5 max-w-xl mx-auto font-bold">
            <span className="text-yellow-600">Impulsa</span> tu marca y/o aumenta tus ventas
          </h3>

          <p className="uppercase font-extralight max-w-lg mx-auto md:p-0 mb-3 text-gray-500 md:px-0 px-10">
            Te ayudamos a crear recursos clave y conectar todo para una estrategia de comercialización más completa.
          </p>
        </section>

        <section className="space-y-5 md:w-1/4 w-full md:px-0 px-12 mx-auto pb-10">

          <div className="grid md:grid-cols-3">
            <div className="col-span-1 w-full md:flex justify-end pr-12 hidden">
              <Rocket size={48} className="text-right text-white h-auto py-10" />
            </div>
            <div className="col-span-2 p-3 border-l border-gray-600 pl-12">
              <h2 className="md:text-4xl text-4xl font-Bebas-Neue text-gray-600">Comercialización digital</h2>
              <ul className="text-blue-500 text-lg md:space-y-1 space-y-3">
                <li>
                  <Link className="underline decoration-gray-60 text-blue-500" href="/servicios/comercializacion">
                    Ecosistemas digitales para embudos de venta de punta a punta
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-3">
            <div className="col-span-1 w-full md:flex justify-end pr-12 hidden">
              <Video size={48} className="text-right text-white h-auto py-10" />
            </div>
            <div className="p-3 border-l border-gray-700 pl-12">
              <h2 className="text-4xl font-Bebas-Neue text-gray-600">Video</h2>
              <ul className="text-blue-500 text-lg md:space-y-1 space-y-3">
                <li><Link className="inline underline decoration-gray-60" href="./servicios/video-corporativo">Corporativo</Link> </li>
                <li><Link className="underline decoration-gray-60" href="./servicios/video-comercial">Promocional</Link> </li>
                <li><Link className="underline decoration-gray-60" href="./servicios/video-social">Social</Link> </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-3">
            <div className="col-span-1 w-full md:flex justify-end pr-12 hidden">
              <Camera size={48} className="text-right text-white h-auto py-10" />
            </div>
            <div className="p-3 border-l border-gray-600 pl-12">
              <h2 className="text-4xl font-Bebas-Neue text-gray-600">Fotografía</h2>
              <ul className="text-blue-500 text-lg md:space-y-1 space-y-3">
                <li><Link className="underline decoration-gray-60" href="./servicios/fotografia-corporativa">Corporativa</Link> </li>
                <li><Link className="underline decoration-gray-60" href="./servicios/fotografia-comercial">Comercial</Link> </li>
                <li><Link className="underline decoration-gray-60" href="./servicios/fotografia-social">Social</Link> </li>
              </ul>
            </div>
          </div>

        </section>

      </div>


    </div>
  )
}

export default page
