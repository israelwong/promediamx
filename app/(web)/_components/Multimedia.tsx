'use client';


import React from 'react'
import VideoPlayer from "./VideoPlayer";
import BtnSeccion from './BtnSeccion';


function Multimedia() {
  return (
    <div className='mx-auto 
      md:w-full
      overflow-x-hidden
      bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 to-black
      border-t border-t-gray-800 border-b border-b-gray-800 border-dotted
      md:py-10 md:mb-10 
      px-0
      mb-5 pb-10 
      md:mt-0 mt-10

      '>

      <div className='md:max-w-screen-lg max-w-sm mx-auto md:px-0 px-0'>

        <div className="mx-auto max-w-screen-sm md:pt-0 pt-5 md:pb-12 p-5">
          <h2 className="font-Bebas-Neue text-center 
            md:text-6xl 
            text-4xl 
            text-gray-600 px-12">
            Creación profesional de <span className="underline text-gray-300">contenido multimedia</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          {/* <!-- Fotografía --> */}

          <div className="bg-fuchsia-950/20 border-4 border-gray-800 p-5 rounded-md">

            <h2 className="text-4xl font-Bebas-Neue text-center mb-5 tracking-wide text-fuchsia-950">
              Shooting fotográfico
            </h2>

            <div className="grid grid-cols-2 gap-5">

              <div className="text-right border-r border-r-gray-700 pr-5">
                <VideoPlayer
                  src={"https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/shooting.webm"}
                />
                <ul className="text-gray-500 mt-3 text-sm">
                  <li><i className="fas fa-check"></i> Alta resolución</li>
                  <li><i className="fas fa-check"></i> Nitidez</li>
                  <li><i className="fas fa-check"></i> Colores vividos</li>
                </ul>
              </div>

              <div>

                <p className="text-gray-400 text-left md:text-2xl mb-5">
                  Presenta imágenes persuasivas y aspiracionales a tu nicho de mercado
                </p>

                <BtnSeccion id={'btn_shooting'} title={'Ver más'} href={'/servicios'} bordercolor={'border-purple-900'} />

              </div>

            </div>

          </div>


          {/* <!-- Video --> */}

          <div className="bg-fuchsia-950/20 border-4 border-gray-800 p-5 rounded-md max-w-full">
            <h2 className="text-4xl font-Bebas-Neue text-center mb-5 tracking-wide text-fuchsia-950">
              Producción de video
            </h2>
            <div className="grid grid-cols-2 gap-5">

              <div className="text-right border-r border-r-gray-700 pr-5">

                <VideoPlayer
                  src={"https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/clips/restaurante.webm"}
                />

                <ul className="text-sm text-gray-500 mt-3">
                  <li><i className="fas fa-check"></i> De 30 a 60 seg</li>
                  <li><i className="fas fa-check"></i> Calidad 4k</li>
                  <li><i className="fas fa-check"></i> Tomas cinemáticas</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-400 text-left md:text-2xl mb-5">
                  Interés instantáneo a través reels profesionales de alta calidad
                </p>

                <BtnSeccion id={'btn_video'} title={'Ver más'} href={'servicios'} bordercolor={'border-purple-900'} />

              </div>

            </div>

          </div>


        </div>

      </div>

    </div>
  )
}

export default Multimedia
