'use client';
import React, { useState } from 'react';

const soluciones = [
    {
        pregunta: '¿Existen contratos de permanencia mínima?',
        respuesta: 'No, no hay contratos de permanencia mínima. Puedes cancelar en cualquier momento.',
    },
    {
        pregunta: '¿Ofrecen descuentos por contratos a largo plazo?',
        respuesta: 'Sí, contamos con descuentos para contratos a partir de 6 meses.',
    },
    {
        pregunta: '¿Cómo se calculan los precios de los servicios adicionales?',
        respuesta: 'Se suman al costo base del plan y se prorratean según el tiempo restante del contrato.',
    },
    {
        pregunta: '¿Qué métodos de pago aceptan?',
        respuesta: 'Tarjeta de crédito, débito, transferencia bancaria y depósito en OXXO.',
    },
    {
        pregunta: '¿Cómo funcionan los pagos recurrentes?',
        respuesta: 'Se realizan mensualmente de forma automática con tarjeta de crédito o débito.',
    },
    {
        pregunta: '¿Puedo modificar el diseño de mi landing page?',
        respuesta: 'Nosotros lo hacemos por ti según tus necesidades, entregándote un diseño atractivo y funcional.',
    },
    {
        pregunta: '¿Las landing pages incluyen dominio y hosting?',
        respuesta: 'Incluyen un subdominio de la plataforma y hosting en nuestros servidores.',
    },
    {
        pregunta: '¿Qué es una landing page omnicanal?',
        respuesta: 'Es una página web donde se concentra toda la información de tu producto o servicio, con acciones de contacto como formularios, WhatsApp, teléfonos, horarios y mapa de ubicación.',
    },
    {
        pregunta: '¿Ustedes crean el contenido o debo proporcionarlo?',
        respuesta: 'Te ayudamos a crear el contenido, pero si ya cuentas con él, lo optimizamos para tus redes sociales.',
    },
    {
        pregunta: '¿En qué redes sociales publican contenido?',
        respuesta: 'Publicamos en todas las redes sociales, pero nos adaptamos a tus preferencias.',
    },
    {
        pregunta: '¿Manejan campañas pagadas o solo contenido orgánico?',
        respuesta: 'Manejamos ambos, pero recomendamos combinarlos para obtener mejores resultados.',
    },
    {
        pregunta: '¿Cómo se organiza la planificación de contenido?',
        respuesta: 'Creamos un calendario de publicaciones mensual y lo ajustamos según los resultados.',
    },
    {
        pregunta: '¿Tienen más soluciones o solo las que se listan?',
        respuesta: 'Contamos con más soluciones, pero estas son las más solicitadas por nuestros clientes.',
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
                    Preguntas frecuentes
                </h1>
            </header>
            {soluciones.map((solucion, index) => (
                <article key={index} className="px-5 py-3 border border-pink-950 rounded-md mb-3"
                    onClick={() => toggleDescripcion(index)} style={{ cursor: 'pointer' }}>
                    <header className="flex items-center justify-between">

                        <h2 className="bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
                            {solucion.pregunta}
                        </h2>
                        <div className='text-rose-950'>
                            {visibleIndex === index ? '▲' : '▼'}
                        </div>
                    </header>
                    <div
                        className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? 'max-h-80' : 'max-h-0'}`}
                    >
                        <p className="text-sm text-zinc-500 pt-2 pb-1">
                            {solucion.respuesta}
                        </p>
                    </div>
                </article>
            ))}
        </section>
    );
}
