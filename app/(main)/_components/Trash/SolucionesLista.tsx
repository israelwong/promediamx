'use client';
import React, { useState } from 'react';
import LeadFormLite from '../LeadFormLite';

const soluciones = [
    {
        titulo: 'Automatización de respuestas a mensajes en redes sociales',
        descripcion: 'Automatiza tu atención al cliente 24/7 en WhatsApp, Instagram, Facebook o TikTok, ahorra tiempo, aumenta ventas y monitoreamos tus contactos para evitar costos extra; ¡prueba gratis por 7 días!',
        // beneficios: [
        //     'Responde en segundos en Instagram, Facebook, WhatsApp o TikTok.',
        //     'Aumenta ventas al capturar leads automáticamente.',
        //     'Reduce carga operativa, evitando que el personal pierda tiempo en respuestas repetitivas.',
        //     'Evita costos ocultos, ya que nuestra agencia monitorea los contactos para optimizar el uso de contactos',
        // ],
        // proceso: [
        //     'Configuramos la automatización en la red social que elijas.',
        //     'Creamos respuestas personalizadas según las preguntas más comunes.',
        //     'Monitoreamos y optimizamos para evitar costos extra.',
        //     'Tú solo recibes clientes listos para comprar o agendar una cita.',
        // ],
        recurrente: true,
        precio: 2500,
        comentarios: 'Precio por red social. Red social adicional $1,500. No incluye costo por campañas de publicidad',
    },
    {
        titulo: 'Cobrar en línea con TD/TC, MSI y OXXO',
        descripcion: 'Olvídate de las terminales bancarias y obtén una solución flexible y escalable para aceptar pagos online en tu sitio web, landing page o redes sociales. Con nuestra pasarela de pagos Stripe, puedes aceptar pagos con tarjetas, OXXO y más, sin costos de instalación ni comisiones ocultas.',
        precio: 2000,
        recurrente: true,
        comentarios: 'Sin costo de implementación. Stripe cobra una comisión fija + comisión variable por transacción según método de pago',
    },
    {
        titulo: 'Pagina web básica para captar clientes',
        descripcion: 'Te ofrecemos una landing page personalizada con un leadform integrado, diseñado para captar interesados y generar oportunidades de negocio. Los leads generados serán enviados en tiempo real a tu WhatsApp y podrás consultarlos en tu web app de manera fácil y rápida.',
        precio: 2500,
        recurrente: true,
        comentarios: 'El precio no incluye dominio, catálogo de productos, tienda en línea o pasarela de pagos',
    },
    {
        titulo: 'Aumentar la visibilidad de mi negocio',
        descripcion: 'Aumenta tu visibilidad y atrae clientes con campañas personalizadas en Google Ads y Meta Ads. Gestionamos, optimizamos y maximizamos tus resultados con seguimiento constante y reportes mensuales. ¡Haz crecer tu negocio en línea hoy mismo!',
        precio: 4000,
        recurrente: true,
        comentarios: 'El precio no incluye el presupuesto de publicidad',
    },
    {
        titulo: 'Enviar SMS masivos',
        descripcion: 'Enviamos mensajes personalizados y promociones a gran escala, asegurando que tu mensaje llegue de manera directa y efectiva. Se pueden incluir links de cobro.',
        precio: 500,
        recurrente: false,
        comentarios: 'El precio solo inluye la configuración y envio. No incluye el costo de los mensajes',
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
                        className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? '' : 'max-h-0'}`}
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
