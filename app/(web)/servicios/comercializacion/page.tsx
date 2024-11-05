import React from 'react'
import type { Metadata } from "next";
import BtnCerrarVentana from '../../_components/BtnCerrarVentana';
import Servicios from '../../_components/Servicios';

export const metadata: Metadata = {
    title: 'Comercialización digital',
    description: 'Comerciaización digital, marketing digital, sitios web, landing pages, fotografía y video',
    metadataBase: new URL('https://promedia.mx/servicios/comercializacion'),
};

function page() {

    const color = "#312e81"

    return (
        <div>

            <div className="mb-6 text-center pt-10 pb-5 w-full mx-auto mt-10 max-w-screen-md px-10">
                <h1 className={`md:text-6xl text-5xl text-[${color}] font-Bebas-Neue tracking-wide md:pb-1 pb-5`}>
                    Creamos y conectamos <span className="animate-pulse text-yellow-600">todo</span> de punta a punta
                </h1>
                <h4 className="md:text-2xl text-xl md:px-0 px-5 max-w-screen-md mx-auto text-gray-400 font-extralight">
                    &quot;Diseñamos embudos, producimos multimedia e integramos tecnologías de última generación para automatizar procesos y maximizar resultados.&quot;
                </h4>
            </div>

            <div className='max-w-screen-lg mx-auto'>
                <Servicios />
            </div>

            <BtnCerrarVentana
                url={'/servicios'}
            />

        </div>

    )
}

export default page
