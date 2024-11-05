import React from 'react'
import type { Metadata } from "next";
import VideoPlayer from '../_components/VideoPlayer';
import LogosClientes from '../_components/LogosClientes';
import LogosClientesSlider from '../_components/LogosClientesSlider';
import { ChevronRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Clientes',
  description: 'Creamos para nuesros clientes proyectos de comercialización digital, campañas de marketing, sitios web, videos y fotografías institucionales, comerciales y sociales.',
  metadataBase: new URL('https://promedia.mx/clientes'),
};

function Page() {
  return (
    <div>

      <section className="mx-auto md:max-w-screen-lg md:flex md:gap-5 md:py-10">

        {/* <!-- VIDEO --> */}

        <VideoPlayer
          src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/reel2024_1min_SD.webm?t=2024-09-27T18%3A17%3A22.773Z"
          muted={false}
          controls={true}
        />

        <div className="
        mx-auto 
        text-center max-w-sm 
        md:p-0 p-5
        md:mt-0 mt-10
        md:mb-0 mb-10
        md:text-left 
        md:pt-10 
        md:bg-transparent bg-gray-800/30
        rounded-md
        ">

          <h2 className="font-Bebas-Neue text-6xl text-yellow-600 pb-1">
            Muchas gracias
          </h2>

          <div>

            <p className="text-sm py-3 italic">Todos nuestros clientes son importantes y merecen un servicio
              excepcional respaldado por compromiso y resultados.
            </p>

            <ul className="text-gray-500">
              <li>
                <ChevronRight size={14} className="inline" />
                Gobierno
              </li>

              <li>
                <ChevronRight size={14} className="inline" />
                Instituciones educativas
              </li>

              <li>
                <ChevronRight size={14} className="inline" />
                Inmobiliarias
              </li>

              <li>
                <ChevronRight size={14} className="inline" />
                Empresas
              </li>

              <li>
                <ChevronRight size={14} className="inline" />
                PyMES
              </li>
            </ul>

          </div>
        </div>

      </section>

      <section className='mb-10'>
        <LogosClientesSlider />
      </section>

      <section>
        <LogosClientes />
      </section>

    </div>
  )
}

export default Page