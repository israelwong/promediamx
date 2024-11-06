import React from 'react'
import type { Metadata } from "next";
import BtnCerrarVentana from '../../_components/BtnCerrarVentana';
import BtnWaServicios from '../../_components/BtnWaServicios';
import Galeria from '../../_components/Galeria';
import { Flame, Flag, MessageCircleMore, Heart } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Fotografía corporativa',
    description: 'Fotografía profesional para empresas, corporativos y marcas',
    metadataBase: new URL('https://promedia.mx/servicios/fotografia-corporativa'),
};

function page() {
    const color = "#155e75"
    const dataBtnWa = {
        title: "Cotizar fotografía corporativa",
        message: "Hola, me interesa cotizar el servicio de fotografía corporativa"
    }

    return (

        <div>
            <div className='mx-auto md:max-w-screen-xl grid md:grid-cols-2 md:gap-6 mb-10'>
                <div className="md:mb-6 pt-10 md:pb-2
            ">
                    <h1 className={`
                text-6xl 
                text-[${color}] 
                font-Bebas-Neue 
                tracking-wid pb-4
                md:text-right text-center
                `}>
                        Fotografía corporativa
                    </h1>

                    <p className="
                    mx-auto 
                    md:text-4xl text-2xl
                    md:text-gray-500 text-yellow-800
                    mb-12
                    md:p-0 
                    p-5
                    pb-5 
                    md:bg-transparent bg-yellow-900/20
                    md:text-right text-center
                    ">
                        &quot;Comunica a clientes potenciales y socios comerciales tu identidad de la marca a través de fotografías de tu organización.&quot;
                    </p>

                    <div className="md:text-right text-center md:pb-10 pb-0">
                        <BtnWaServicios
                            id={'btn_foto_corporativa'}
                            title={dataBtnWa.title}
                            message={dataBtnWa.message}
                        />
                    </div>
                </div>

                <div className="md:pt-10 pt-0">
                    <div className="grid md:grid-cols-2 md:gap-2 gap-5 md:p-0 p-5 mt-8 md:mt-0 ">

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                            <Flame size={48} className='mb-3' color={color} />

                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Profesionalismo</h3>
                                <p className="text-gray-400">Comunica profesionalismo y confiabilidad desde el primer vistazo</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                            <Flag size={48} className='mb-3' color={color} />

                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Identidad</h3>
                                <p className="text-gray-400">Muestra tu empresa y lo que representa</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">

                            <MessageCircleMore size={48} className='mb-3' color={color} />

                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Comunicación</h3>
                                <p className="text-gray-400">Puedes utilizarlas en presentaciones, redes sociales y pagina web</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                            <Heart size={48} className='mb-3' color={color} />
                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Contexto</h3>
                                <p className="text-gray-400">Muestra tus productos, servicios y operación</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>


            <Galeria folder={'Corporativo'} />

            <BtnCerrarVentana
                url={'/servicios'}
            />

        </div>


    )
}

export default page
