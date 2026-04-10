import React from 'react'
import Link from "next/link";
import LogosClientesSlider from "./LogosClientesSlider";

export default function ProyectosSlider() {
    return (
        <section>
            <p className="font-FunnelSans-Lights text-white animate-pulse text-xl">
                Más de <strong className="font-FunnelSans-Bold">
                    10 años </strong>
                aportando soluciones con valor.
            </p>
            <p className="text-white font-FunnelSans-Italic px-9 text-sm mb-3">
                Conoce cómo hemos apoyado en otros proyectos{" "}
                <Link
                    href={'/proyectos'}
                    className="text-zinc-500 font-FunnelSans-Italic text-xs underline uppercase"
                    title="Ver más proyectos"
                >
                    Ver proyectos
                </Link>
            </p>
            <LogosClientesSlider />
        </section>
    )
}
