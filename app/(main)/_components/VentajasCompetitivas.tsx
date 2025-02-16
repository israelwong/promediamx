import React from 'react'

export default function VentajasCompetitivas() {


    const ventajas = [
        {
            titulo: 'Costo predecible y sin inversión inicial alta',
            descripcion: 'Un plan mensual te permite acceder a servicios profesionales sin un gran desembolso inicial, manteniendo un flujo de caja saludable.',
        },
        {
            titulo: 'Optimización y mejora continua',
            descripcion: 'Adaptamos estrategias según los resultados, asegurando que tu negocio se mantenga actualizado y competitivo en todo momento.',
        },
        {
            titulo: 'Flexibilidad y escalabilidad',
            descripcion: 'Puedes ajustar los servicios según las necesidades de tu negocio, sin comprometerte a largo plazo.',
        },
        {
            titulo: 'Menos carga operativa para tu equipo',
            descripcion: 'Nos encargamos de la gestión y optimización, permitiéndote enfocarte en hacer crecer tu negocio sin preocuparte por la parte técnica o estratégica.',
        },
        {
            titulo: 'Acceso a un equipo especializado sin contratar personal',
            descripcion: 'Obtienes la experiencia de profesionales en marketing, diseño y estrategia sin los costos fijos de un equipo interno.',
        }
    ];



    return (
        <div>
            <section className="container mx-auto p-5 border border-amber-700 bg-zinc-900 rounded-md">

                <div className="">
                    <h2 className="text-4xl font-FunnelSans-Medium bg-gradient-to-r from-yellow-500 to-red-500 bg-clip-text text-transparent">
                        ¿Por qué elegir un plan mensual con nosotros?
                    </h2>

                </div>
                <ol className="space-y-4 mt-5 font-FunnelSans-Light list-decimal list-inside">
                    {
                        ventajas.map((ventaja, index) => (
                            <li key={index} className="mb-5 flex items-start">
                                <span className="text-xl text-yellow-500 mr-2">{index + 1}.</span>
                                <div>
                                    <h3 className="text-xl text-yellow-500 mb-0">
                                        {ventaja.titulo}
                                    </h3>
                                    <p className="text-zinc-300">{ventaja.descripcion}</p>
                                </div>
                            </li>
                        ))
                    }
                </ol>
            </section>
        </div>
    )
}
