'use client';
import React, { useState } from 'react';
import LeadFormLite from './LeadFormLite';

const soluciones = [
    {
        titulo: 'Automatización de respuestas a mensajes en redes sociales',
        descripcion: 'Configuramos bots para WhatsApp, Instagram, Facebook y Tiktok para atender prospectos y clientes, resolver dudas y recuperar conversaciones en las primeras 24hrs.',
        recurrente: true,
        precio: 300,
        comentarios: 'Precio por red social y configuración básica. Configuraciones avanzadas tienen un costo adicional.',
    },
    {
        titulo: 'Cobrar en línea con TD/TC, MSI y OXXO',
        descripcion: 'Configuramos y monitoreamos cobros en línea seguros con pasarela de pago Stripe, brindando flexibilidad y seguridad en cada transacción.',
        precio: 1000,
        recurrente: true,
        comentarios: 'Stripe cobra una comisión fija + comisión variable por transacción según método de pago',
    },
    {
        titulo: 'Aumentar la visibilidad de mi negocio',
        descripcion: 'Optimizamos tu presencia en Google, mejoramos tu SEO y gestionamos campañas pagadas en Google Ads y Meta Ads para que aparezcas en búsquedas y redes sociales.',
        precio: 2000,
        recurrente: true,
        comentarios: 'El precio no incluye el presupuesto de publicidad',
    },
    {
        titulo: 'Enviar SMS masivos',
        descripcion: 'Enviamos mensajes personalizados y promociones a gran escala, asegurando que tu mensaje llegue de manera directa y efectiva. Se pueden incluir links de cobro.',
        precio: 500,
        recurrente: false,
        comentarios: 'El precio solo cinluye la configuración y envio. No incluye el costo de los mensajes',
    },
    {
        titulo: 'Pagina web básica con formulario de contacto',
        descripcion: 'Creamos una página web básica con información de tu negocio, producto o servicio más n formulario de contacto.',
        precio: 1000,
        recurrente: true,
        comentarios: 'El precio no incluye catálogo de productos, tienda en línea o blog',
    },
];

export default function SolucionesLista() {
    const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
    const [asunto, setAsunto] = useState('');

    const toggleDescripcion = (index: number) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    const [showModal, setShowModal] = useState(false);
    function mostrarModalLeadForm(asuntoOpcion: string) {
        setAsunto(asuntoOpcion)
        setShowModal(true);
    }

    return (
        <section>
            <header className='mb-5'>
                <h1 className='font-FunnelSans-SemiBold text-2xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-2'>
                    Soluciones digitales populares entre nuestros clientes
                </h1>
                <p className='text-zinc-500 font-FunnelSans-Light mx-auto mb-3'>
                    Te presentamos otras soluciones digitales populares que hemos implementado para nuestros clientes.
                </p>
            </header>
            {soluciones.map((solucion, index) => (
                <article key={index} className="px-5 py-3 border border-pink-950 rounded-md mb-3">
                    <header className="flex items-center justify-between"
                        onClick={() => toggleDescripcion(index)} style={{ cursor: 'pointer' }}>

                        <h2 className="bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
                            {solucion.titulo}
                        </h2>
                        <div className='text-rose-950'>
                            {visibleIndex === index ? '▲' : '▼'}
                        </div>
                    </header>
                    <div
                        className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? 'max-h-80' : 'max-h-0'}`}
                    >
                        <p className="text-sm text-zinc-300 pt-2 pb-3">
                            {solucion.descripcion}
                        </p>

                        {solucion.recurrente ? (
                            <p>
                                <span className="font-bold">Plan desde </span> {solucion.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                <span className='text-zinc-500'> /mes</span>
                            </p>
                        ) : (
                            <p>
                                <span className="font-bold">Pago por servicio de </span> {solucion.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                            </p>
                        )}
                        <div className='my-2'>
                            {solucion.comentarios && (
                                <p className="text-zinc-500 text-xs italic">
                                    * {solucion.comentarios}
                                </p>
                            )}
                        </div>
                        <button className="w-full bg-rose-900 border border-rose-600 text-rose-300 py-2 mt-3 rounded-md hover:bg-pink-950 transition-colors duration-300 text-sm"
                            onClick={() => mostrarModalLeadForm(`Me interesa la solución: ${solucion.titulo}`)}>
                            Me interesa esta solución
                        </button>
                    </div>
                </article>
            ))}

            <div className='text-left'>
                {showModal && <LeadFormLite
                    asunto={asunto}
                    onClose={() => setShowModal(false)}
                />}
            </div>

        </section>
    );
}
