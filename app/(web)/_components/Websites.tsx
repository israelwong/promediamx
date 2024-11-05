'use client'
import BtnBorderSolid from "./BtnBorderSolid";
import { MoveRight } from 'lucide-react'
import Image from "next/image";


function Landing() {

  const logos = [
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/astro.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/conekta.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/mysql.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/tailwindcss-icon-svgrepo-com.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/nextjs.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/nodejs.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/postgresql.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/reactjs.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/stripe.svg",
    "https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logos_tecnologias/google-analytics.svg",
  ]

  return (
    <div>

      <div className="md:p-0 p-3">
        <div
          className="mx-auto
      md:max-w-screen-lg max-w-sm
      md:my-10 mb-0
      md:p-10 p-5
      bg-orange-950/20
      rounded-md border ring-red-400 border-orange-800"
        >
          <h1
            className="mx-auto text-center
        text-orange-400
        md:text-5xl text-2xl
        md:pb-10 pb-5"
          >
            Diseño web
          </h1>

          <div className="grid md:grid-cols-2 md:gap-5">
            <div className="text-center mb-6">
              <h2
                className="
              md:text-5xl text-4xl
              font-Bebas-Neue
              md:text-right text-center
              px-10
              leading-tight"
              >
                Una <span className="animate-pulse text-orange-400">heramienta impresindible </span> para generar prospectos y cerrar ventas
              </h2>

              <div className="md:text-right text-center px-10 pt-5">
                <BtnBorderSolid
                  id={"btn_web"}
                  title={"Cotizar servicio"}
                  message={"Me interesa cotizar el servicio una landing page"}
                  colorborder={"border-orange-500"}
                />
              </div>
            </div>

            <div className="md:pr-5">

              <p className="text-xl text-gray-200 max-w-xl mx-auto mb-4 font-extralight">
                Diseñamos <span className="font-bold text-orange-300">paginas web</span> a la medida, funcionales y atractivas con tecnologías de última generación para desarrollos a la medida y escalables.
              </p>



              <ul className="text-gray-400 text-left">
                <li><MoveRight size={12} className="inline-block" /> Astro Build | Next JS</li>
                <li><MoveRight size={12} className="inline-block" /> ReactJs | NodeJS</li>
                <li><MoveRight size={12} className="inline-block" /> TailwindCSS</li>
                <li><MoveRight size={12} className="inline-block" /> PostgreSQL | MySQL</li>
                <li><MoveRight size={12} className="inline-block" /> Conekta | Stripe</li>
              </ul>


            </div>


          </div>

          <div className="items-center text-center">
            <div className="grid grid-cols-5 gap-4 mt-10">
              {logos.map((logo, index) => (
                <div key={index} className="bg-white w-full h-20 flex items-center justify-center rounded-md">
                  <Image
                    width={100}
                    height={100}
                    src={logo}
                    alt="logo"
                    className="w-12 h-12"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>


    </div>
  )
}

export default Landing
