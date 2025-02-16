'use client'

import React from 'react'
import Head from 'next/head'
import Hero from "@/app/(main)/_components/Hero";
import SolucionesPlanV3 from "./SolucionesPlan-v3";
import SolucionesPopulares from "./SolucionesPopulares";
import ProyectosSlider from "./ProyectosSlider";

import TecnologiasYHerramientas from "./TecnologiasYHerramientas";
import ModelosContratacion from "./ModelosContratacion";
import FAQ from "./FAQ";
import VentajasCompetitivas from './VentajasCompetitivas';
import FraseCEO from './FraseCEO';

import FichaBeneficiosContenidoRRSS from './FichaBeneficiosContenidoRRSS';
import FichaComoCierroVentas from './FichaComoCierroVentas';
import FichaPorquePagarCreacionRRSS from './FichaPorquePagarCreacionRRSS';
import FichaMaximizaPotencialRRSS from './FichaMaximizaPotencialRRSS';
import BuscasOtraSolucion from './BuscasOtraSolucion';


export default function Principal() {

    return (
        <div>
            <Head>
                <title>Promedia México</title>
                <meta name="description" content="Promedia México. Descrubre nuesras soluciuones, proyectos populares y más." />
                <meta name="keywords" content="Marketing digital, comercialización digital, modelos de contratación" />
                <meta name="author" content="Israel Wong" />
                <meta property="og:title" content="ProMedia México" />
                <meta property="og:description" content="Marketing digital, comercialización digital, modelos de contratación" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://www.promediaapp.com" />
                <meta property="og:image" content="https://www.promediaapp.com/images/og-image.jpg" />
            </Head>
            <div className="py-28">
                <Hero />
            </div>

            <div className="mb-28 text-center">
                <ProyectosSlider />
            </div>

            <div className='md:mb-5 mb-5'>
                <SolucionesPlanV3 />
            </div>

            <div className='md:mb-5 mb-5'>
                <SolucionesPopulares />
            </div>


            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 md:mb-5 mb-5'>
                <FichaBeneficiosContenidoRRSS />
                <div>
                    <FichaComoCierroVentas />
                </div>
                <div>
                    <div className='mb-5'>
                        <FichaPorquePagarCreacionRRSS />
                    </div>
                    <div>
                        <FichaMaximizaPotencialRRSS />
                    </div>
                </div>

            </div>

            <div className="text-center md:my-5 border border-dotted border-zinc-800 rounded-md mb-5">
                <BuscasOtraSolucion />
            </div>

            <div className='md:mb-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-5'>
                <div>
                    <FAQ />
                </div>

                <div className="">
                    <FraseCEO />
                    <VentajasCompetitivas />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:space-x-5">
                <div className="col-span-1">
                    <ModelosContratacion />
                </div>
                <div className="col-span-2">
                    <TecnologiasYHerramientas />
                </div>
            </div>

        </div>
    )
}
