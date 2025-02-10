'use client'

import React from 'react'
import Hero from "@/app/(main)/_components/Hero";
// import SolucionesPlan from "./SolucionesPlan";
import SolucionesPlanV2 from "./SolucionesPlan-v2";
import SolucionesLista from "./SolucionesLista";
import ProyectosSlider from "./ProyectosSlider";

import TecnologiasYHerramientas from "./TecnologiasYHerramientas";
import BuscasOtraSolucion from "./BuscasOtraSolucion";
import ModelosContratacion from "./ModelosContratacion";

export default function Principal() {

    return (
        <div>
            <div className="py-28">
                <Hero />
            </div>

            <div className="mb-28 text-center">
                <ProyectosSlider />
            </div>

            <div>
                {/* <SolucionesPlan /> */}
                <SolucionesPlanV2 />
            </div>

            <div className="text-center my-5 border border-dotted border-zinc-800 rounded-md">
                <BuscasOtraSolucion />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-7 mb-5">
                <div className="col-span-1">
                    <SolucionesLista />
                </div>
                <div className="col-span-2">
                    <ModelosContratacion />
                </div>
            </div>

            <div>
                <TecnologiasYHerramientas />
            </div>

        </div>
    )
}
