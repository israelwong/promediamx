'use client';
import React, { useState } from 'react';

const soluciones = [
    {
        titulo: 'Obtener más clientes',
        descripcion: 'Generamos más clientes potenciales para tu negocio con una estrategia combinada de contenido orgánico, anuncios pagados y optimización digital. Implementamos campañas de Ads segmentadas y estrategias de remarketing para maximizar tu visibilidad y conversión. Además, automatizamos la captación de leads con formularios inteligentes y seguimiento automatizado.',
        tags: ['Marketing', 'SEO', 'Ads', 'Remarketing', 'Automatización']
    },
    {
        titulo: 'Aumentar la visibilidad de mi negocio',
        descripcion: 'Optimizamos tu presencia en Google, mejoramos tu SEO y gestionamos campañas pagadas en Google Ads y Meta Ads para que aparezcas en búsquedas y redes sociales.',
        tags: ['Marketing', 'SEO', 'Ads', 'Presencia en buscadores', 'Google Mi Negocio', 'Campañas pagadas']
    },
    {
        titulo: 'Automatización respuestas a mensajes',
        descripcion: 'Configuramos bots inteligentes para WhatsApp, Instagram, Facebook y Tiktok para atender prospectos y clientes, resolver dudas y generar leads.',
        tags: ['Automatización', 'Chatbot', 'Bots', 'Respuestas automáticas']
    },
    {
        titulo: 'Enviar masivos por correo',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Recontactar a prospectos que no compraron',
        descripcion: 'Recupera clientes potenciales con mensajes automatizados. Utilizamos estrategias de remarketing y automatización con ManyChat Pro para reactivar a los prospectos que no completaron su compra, manteniéndolos interesados y listos para convertir.',
        tags: ['Automatización', 'Remarketing', 'Conversión']
    },
    {
        titulo: 'Chatbot en mi pagina web',
        descripcion: 'Implementamos un sistema automático que responde preguntas, captura leads y guía a los visitantes en tiempo real, mejorando la experiencia del usuario y aumentando conversiones.',
        tags: ['Automatización', 'Chatbot', 'Bots', 'Conversión']
    },
    {
        titulo: 'Cobrar en línea',
        descripcion: 'Configuramos cobros en línea con opciones como OXXO, SPEI, tarjetas y pagos en mensualidades (MSI), brindando flexibilidad y seguridad en cada transacción.',
        tags: ['E-commerce', 'Seguridad', 'Pagos en línea', 'Stripe', 'Comercio electrónico', 'Cobros en línea']
    },
    {
        titulo: 'Enviar mensajes de WhatsApp masivos',
        descripcion: 'Usamos la API de WhatsApp para enviar promociones, actualizaciones y notificaciones a grandes grupos de manera eficiente y personalizada.',
        tags: ['Automatización', 'WhatsApp', 'Mensajes masivos']
    },
    {
        titulo: 'Enviar SMS masivos',
        descripcion: 'Enviamos mensajes personalizados y promociones a gran escala, asegurando que tu mensaje llegue de manera directa y efectiva.',
        tags: ['Automatización', 'Marketing', 'Mensajería masiva', 'SMS']
    },
    {
        titulo: 'Enviar correos masivos',
        descripcion: 'Usamos Mailchimp para diseñar plantillas atractivas y monitorear aperturas, asegurando que tus mensajes lleguen a los clientes adecuados y generen resultados.',
        tags: ['Marketing', 'Email Marketing', 'Mailchimp', 'Automatización', 'Campañas masivas']
    },
];

export default function SolucionesLista() {
    const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

    const toggleDescripcion = (index: number) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    return (
        <section>
            <header className='mb-5'>
                <h1 className='font-FunnelSans-SemiBold text-2xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text mb-2'>
                    Soluciones digitales más populares entre nuestros clientes
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
                        <p className="text-sm text-zinc-500 pt-2 pb-1">
                            {solucion.descripcion}
                        </p>
                        {solucion.tags && solucion.tags.length > 0 && (
                            <footer className="flex flex-wrap mt-2 max-h-40">
                                {solucion.tags.map((tag, tagIndex) => (
                                    <span key={tagIndex} className="bg-zinc-900 text-zinc-500 border border-zinc-800 text-xs font-semibold mr-2 mb-2 px-2.5 py-0.5 rounded-full hover:bg-zinc-800 hover:text-white transition-colors duration-300">
                                        {tag}
                                    </span>
                                ))}
                            </footer>
                        )}

                        <button className="w-full bg-rose-900 border border-rose-600 text-rose-300 py-2 mt-3 rounded-md hover:bg-pink-950 transition-colors duration-300 text-sm">
                            Me interesa esta solución
                        </button>

                    </div>

                </article>
            ))}
        </section>
    );
}
