import React from 'react'
import Link from "next/link";
import LogosClientesSlider from "./LogosClientesSlider";

export default function ProyectosSlider() {
    return (
        <section>
            <LogosClientesSlider />
            <p className="font-FunnelSans-Lights text-zinc-400 animate-pulse">
                Más de <strong className="font-FunnelSans-Bold">
                    10 años </strong>
                aportando soluciones con valor.
            </p>
            <p className="text-zinc-700 font-FunnelSans-Italic px-9">
                Conoce cómo hemos apoyado en otros proyectos{" "}
                <Link href={'/proyectos'} className="text-zinc-500 font-FunnelSans-Italic text-xs underline uppercase">
                    Ver proyectos
                </Link>
            </p>
        </section>
    )
}
