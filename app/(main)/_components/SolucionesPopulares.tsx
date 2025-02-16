'use client';
import React from 'react';
import Link from 'next/link';

const soluciones = [
    {
        titulo: 'Automatización de mensajes en tus redes',
        descripcion: 'Automatización 24/7 de conversaciones en WhatsApp, Instagram, Facebook y TikTok. Responde preguntas frecuentes y envía enlaces de compra a Mercado Libre, Amazon, landing pages o pasarelas de pago.',
        recurrente: true,
        precio: 2000,
        link: '/servicios/respuestas-automatizadas-redes-sociales'
    },
    {
        titulo: 'Diseño de landing page para captar clientes',
        descripcion: 'Diseñamos una página omnicanal con formulario de contacto para captar prospectos de mayor calidad. Integramos links de tus redes sociales, WhatsApp y otros canales para mejorar la conversión y el seguimiento.',
        precio: 1500,
        recurrente: true,
        link: '/servicios/diseno-landing-page'
    },
    {
        titulo: 'Producción de imagen para redes sociales',
        descripcion: 'Capturamos contenido visual en fotografía y video y te lo entregamos para que lo edites y gestiones a tu manera. En este servicio solo realizamos la toma de imágenes, sin edición.',
        precio: 2500,
        recurrente: false,
        link: '/servicios/produccion-fotos-videos-redes-sociales'
    },
    {
        titulo: 'Optimización de contenido para redes sociales',
        descripcion: 'Tú generas el contenido, nosotros lo optimizamos en varios formatos para tus redes. En este servicio solo recibimos y editamos el material para adaptarlo a reels, historias, carruseles, etc.',
        precio: 2000,
        recurrente: true,
        link: '/servicios/edicion-contenido-redes-sociales'
    },
];



export default function SolucionesPopulares() {
    return (
        <section className='container mx-auto px-5 py-10 border border-dotted border-zinc-800 rounded-md bg-zinc-900/50'>
            <header className='mb-5 text-left'>
                <h1 className='text-2xl text-zinc-200 font-FunnelSans-Medium mb-3'>
                    Soluciones puntuales, flexibles y escalables
                </h1>
                <p className='text-zinc-200 font-FunnelSans-Light mx-auto mb-3'>
                    Ofrecemos soluciones que puedes usar de forma independiente o integrar a medida que tu negocio crece.
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-2 gap-4">
                {soluciones.map((solucion, index) => (

                    <article key={index} className="px-5 py-3 border-l border-pink-950 bg-zinc-900/50">
                        <header className="flex items-center justify-between">
                            <h2 className="bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text text-lg">
                                {solucion.titulo}
                            </h2>
                        </header>
                        <p className="text-sm text-zinc-300 pt-2 pb-3">
                            {solucion.descripcion}
                        </p>

                        <div className='font-FunnelSans-SemiBold mb-2 text-lg'>
                            {solucion.recurrente ? (
                                <p>
                                    <span className="font-bold">Plan desde </span> {solucion.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                    <span className='text-zinc-500'> /mes</span>
                                </p>
                            ) : (
                                <p>
                                    <span className="font-bold">Servicio desde </span> {solucion.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                </p>
                            )}
                        </div>

                        <Link
                            className="py-2 px-3 bg-rose-900 border border-rose-600 text-rose-300  mt-3 rounded-full hover:bg-pink-950 transition-colors duration-300 text-xs mb-3 inline-block"
                            href={'https://calendly.com/promediamx/30min'}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Agenda una reunión virtual"
                        >
                            Más información
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}
