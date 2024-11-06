import React from 'react'
import type { Metadata } from "next";
import BtnCerrarVentana from '../../_components/BtnCerrarVentana';
import BtnWaServicios from '../../_components/BtnWaServicios';
import Galeria from '../../_components/Galeria';
import { Rocket, Check, UsersRound, Megaphone, Star } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Fotografía corporativa',
    description: 'Fotografía profesional para empresas, corporativos y marcas',
    metadataBase: new URL('https://promedia.mx/servicios/fotografia-corporativa'),
};

function page() {

    const color = "#0369a1"
    const dataBtnWa = {
        title: "Cotizar fotografía social",
        message: "Hola, me interesa cotizar el servicio de fotografía social"
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
                        Fotografía social
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
                        &quot;Capta la atención, transmite confianza y has destacar a tu negocio de la competencia para maximizar resultados&quot;
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
                            <Rocket size={48} color={color} className='mb-3' />
                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Profesionalismo</h3>
                                <p className="text-gray-400">Refleja el profesionalismo y la calidad de tu negocio.</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                            <Check size={48} color={color} className='mb-3' />
                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Confianza</h3>
                                <p className="text-gray-400">Brinda a tus prospectos y clientes la confianza que los motive a comprar</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                            <UsersRound size={48} color={color} className='mb-3' />

                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Diferenciación</h3>
                                <p className="text-gray-400">Destaca a tu negocio de entre la competencia</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                            <Megaphone size={48} color={color} className='mb-3' />
                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Atención</h3>
                                <p className="text-gray-400">Resalta las características y beneficios de manera atractiva y persuasiva</p>
                            </div>
                        </div>

                        <div className="p-5 border-4 border-gray-800 rounded-md bg-slate-500/10">
                            <Star size={48} color={color} className='mb-3' />
                            <div>
                                <h3 className="text-3xl font-Bebas-Neue tracking-wid">Reconocimiento</h3>
                                <p className="text-gray-400">Impulsa el reconocimiento de tu marca.</p>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            <Galeria folder={'Social'} />

            <BtnCerrarVentana
                url={'/servicios'}
            />

        </div>


    )
}

export default page
