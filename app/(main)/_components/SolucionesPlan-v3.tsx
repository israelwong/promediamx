
import React from 'react'
import Link from 'next/link';

export default function Servicios() {


    const servicios = [
        {
            nombre: 'Plan de creación de contenido todo incluido para destacar en redes sociales',
            descripcion: 'Comunicamos tu oferta de forma clara y atractiva, generando contenido que refuerce la confianza y facilite la decisión de compra.',
            precio: 5000,
            title_gradient: 'bg-gradient-to-r from-pink-500 to-yellow-500',
            background: 'bg-zinc-900',
            // link: '/servicios/plan-contenido-redes-sociales',
        },
        {
            nombre: 'Kit de imagen profesional digital para posicionarte como líder en tu sector',
            descripcion: 'Construimos una imagen sólida con diseño gráfico, web y producción audiovisual para destacar tu marca y posicionarte como líder en tu sector.',
            title_gradient: 'bg-gradient-to-r from-blue-500 to-cyan-500',
            precio: 5000,
            // link: '/servicios/kit-imagen-marca-profesional',
        },
        {
            nombre: 'Diseño de embudo de ventas para obtener clientes potenciales usando redes sociales',
            descripcion: 'Diseñamos un embudo de ventas personalizado para atraer más clientes potenciales de mejor calidad, desde el diseño de la campaña hasta el cierre.',
            precio: 8000,
            title_gradient: 'bg-gradient-to-r from-pink-500 to-red-500',
            background: 'bg-zinc-900',
            // link: '/servicios/diseno-embudo-ventas-digital'
        },
    ];


    return (
        <section>
            <div>
                <h1 className='text-center md:text-3xl text-3xl px-5 md:mb-0 mb-3 md:font-FunnelSans-Light font-FunnelSans-Regular text-zinc-300'>
                    Soluciones integrales para negocios
                </h1>
                <p className='font-FunnelSans-Regular text-zinc-500 text-center md:px-12 px-5 mb-5'>
                    Te presentamos algunas de las soluciones integrales que hemos implementado para nuestros clientes.
                </p>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>


                {servicios.map((servicio, index) => (
                    <article key={index} className='col-span-1'>
                        <div className={`border border-zinc-800 ${servicio.background || 'bg-zinc-950'} rounded-lg p-5 `}>
                            <h1 className={`md:text-2xl text-2xl font-FunnelSans-Bold mb-2 bg-clip-text text-transparent ${servicio.title_gradient || ''}`}>
                                {servicio.nombre}
                            </h1>
                            <p className='mt-2 text-sm text-zinc-500'>
                                {servicio.descripcion}
                            </p>
                            <p className='mt-2 font-FunnelSans-Light mb-4'>
                                Plan desde {servicio.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}/mes
                            </p>

                            <Link
                                className='border border-zinc-700 bg-zinc-900 text-zinc-400 px-4 py-2 rounded-full mt-2 text-sm'
                                href={'https://calendly.com/promediamx/30min'}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Más información
                            </Link>

                        </div>
                    </article>
                ))}

            </div>
        </section>
    )
}
