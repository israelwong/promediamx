'use client'

import BtnBorderSolid from "./BtnBorderSolid";
import LogosPlataformas from "./LogosPlataformas";

function Marketing() {
  return (
    <div>


      <section className="md:p-0 p-3">
        <div
          className="
        mx-auto 
        md:max-w-screen-lg max-w-sm
      mb:my-10 mb-0
    bg-green-950/20 rounded-md border ring-red-400 border-green-500
    md:p-10 p-5
    "
        >
          <h1
            className="mx-auto text-center
      md:text-5xl text-2xl
      md:pb-10 pb-5
      text-green-400"
          >
            Marketing digital
          </h1>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="text-center md:mb-6">
              <h2
                className="md:text-5xl text-4xl
              font-Bebas-Neue
              md:text-right text-center
              px-10
              leading-tight"
              >
                Haz <span className="animate-pulse text-green-300">presencia</span> en
                todas las plataformas
              </h2>

              {/* <!-- visible desktop --> */}
              <div className="md:text-right md:px-10 pt-8 mx-auto md:block hidden">
                <BtnBorderSolid
                  id={"btn_mk"}
                  title={"Cotizar servicio"}
                  message={"Me interesa cotizar el servicio de marketing digital"}
                  colorborder={"border-green-500"}
                />
              </div>
            </div>

            <div className="md:pr-5">


              <p
                className="text-xl text-gray-200 max-w-xl mx-auto mb-4 font-extralight text-left px-8 md:px-0"
              >
                Creamos potentes <span className="font-bold text-green-300"> campañas de marketing digital</span> en cualquier plataforma para llegar a tu público objetivo y maximizar tus ventas
              </p>


              <ul className="list-disc md:pl-4 pl-8 text-gray-400 mb-5">
                <li>Clientes potenciales con mayor intención de compra</li>
                <li>Tráfico cualificado hacia tu pagina Web</li>
                <li>Aparecer en los resultados de busqueda de google</li>
                <li>Registrar y configurar tu negocio en google maps</li>
              </ul>
            </div>
          </div>

          <LogosPlataformas />

          {/* <!-- visible movil --> */}
          <div className="pb-5 mx-auto md:hidden block text-center justify-center">
            <BtnBorderSolid
              id={"btn_mk"}
              title={"Cotizar servicio"}
              message={"Me interesa cotizar el servicio de marketing digital"}
              colorborder={"border-green-500"}
            />
          </div>
        </div>
      </section>


    </div>
  )
}

export default Marketing
