'use client'

import React from 'react'
import Hero from "@/app/(main)/_components/Hero";
import SolucionesPlanV3 from "./SolucionesPlan-v3";
import SolucionesPopulares from "./SolucionesPopulares";
import ProyectosSlider from "./ProyectosSlider";

import TecnologiasYHerramientas from "./TecnologiasYHerramientas";
import BuscasOtraSolucion from "./BuscasOtraSolucion";
import ModelosContratacion from "./ModelosContratacion";
import FAQ from "./FAQ";
import VentajasCompetitivas from './VentajasCompetitivas';
import FraseCEO from './FraseCEO';


export default function Principal() {

    return (
        <div>
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


            <div>
            </div>

        </div>
    )
}
