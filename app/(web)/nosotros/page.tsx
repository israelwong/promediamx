import React from 'react'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Creamos campañas de comercialización digital, diseñamos sitios web y producimos fotografía y video profesional para empresas, negocios, y marcas.',
  metadataBase: new URL('https://promedia.mx/nosotros'),
};


function Page() {

  const etiqueta = "bg-zinc-800 text-zinc-500 px-2 py-2 mb-2 text-sm rounded-md text-center inline-block";

  return (
    <div className='bg-gradient-to-b from-black to-zinc-950'>

      {/* header */}
      <h3 className="text-center font-Bebas-Neue text-7xl pt-10 pb-2">Nosotros</h3>
      <p className="mx-auto 
          md:max-w-screen-md
          md:text-3xl text-3xl 
          text-center 
          pb-8 px-5
          md:px-5 
          ">
        Somos una agencia de comercialización digital y creación de contenido multimedia en <span className="text-yellow-200 underline decoration-dotted font-Bebas-Neue">branding</span>, <span className="text-yellow-600 underline decoration-wavy font-Bebas-Neue">marketing </span> y <span className="text-cyan-600 underline decoration-solid font-Bebas-Neue">social media</span>
      </p>

      <div className="mx-auto text-center max-w-screen-sm px-16 md:space-x-3 space-x-1">
        <span className={etiqueta}>#marketing</span>
        <span className={etiqueta}>#comercialización</span>
        <span className={etiqueta}>#automatizaciones</span>
        <span className={etiqueta}>#Fotografía</span>
        <span className={etiqueta}>#Video</span>
        <span className={etiqueta}>#Web</span>
      </div>

      <div className="mx-auto pt-5 pb-5 text-center">
        <i className="text-zinc-700 text-2xl fas fa-angle-down"></i>
      </div>

      {/* mision visión */}
      <div className="md:p-0 p-3">

        <div className="gap-5
          grid
          md:grid-cols-2 
          md:max-w-screen-md
          mx-auto">

          <div className="md:pb-3 rounded-md p-4 bg-slate-800/40">
            <h1 className="text-4xl text-cyan-900 font-Bebas-Neue tracking-wid">
              Visión
            </h1>
            <p className="text-md text-gray-400">
              Ser en 2030 una de las agencias de creación de contenido
              multimedia más reconocidas en el mercado mexicano gracias a sus
              casos de éxito y satisfacción del cliente.
            </p>
          </div>

          <div className="md:pb-3 rounded-md p-5 bg-slate-800/40">
            <h1 className="text-4xl text-cyan-900 font-Bebas-Neue tracking-wid">
              Misión
            </h1>
            <p className="text-md text-gray-400">
              Producir contenido multimedia profesional que ayude a nuestros
              clientes a comunicar su oferta de valor a su mercado meta a
              través de los canales más adecuados.
            </p>
          </div>

        </div>

      </div>

      {/* filosofia */}
      <div className="
        mx-auto
        text-center
        p-10
        md:w-2/4">
            <p className="font-Poppins text-3xl py-2 text-yellow-500 animate-pulse">
                Nuestra filosofía es aportar valor en cada etapa del servicio prestado en los proyectos de nuestros clientes.
            </p>
        </div>


      {/* valores */}
      <section className="mx-auto text-center 
        md:w-2/4 
        px-5
        text-sm 
        mt-0 
        pb-12
        ">

            <h2 className="font-Bebas-Neue text-4xl text-zinc-500 pb-2">Nuestros valores</h2>

            <ul className="list-none grid md:grid-cols-3 grid-cols-2 md:gap-4 gap-2">
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div className="text-slate-400">
                        <i className="fas fa-star"></i>
                    </div>
                    Calidad
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-hourglass-end"></i></div>
                    Eficiencia
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-crown"></i></div>
                    Garantías
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 far fa-handshake"></i></div>
                    Compromiso
                </li>
                <li className=" rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-people-carry"></i></div>
                    Adaptabilidad
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-heart"></i></div>
                    Integridad
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-dove"></i></div>
                    Respeto
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 far fa-comments"></i></div>
                    Comunicación
                </li>
                <li className="rounded-sm border border-gray-500 bg-gray-500/5 md:py-16 py-11">
                    <div><i className="text-slate-400 fas fa-users"></i></div>
                    Trabajo en equipo
                </li>
            </ul>

        </section>

    </div>
  )
}

export default Page
