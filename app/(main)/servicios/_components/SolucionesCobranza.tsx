'use client';
import React, { useState } from 'react';

const soluciones = [
    {
        titulo: 'Obtener más clientes',
        descripcion: 'lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet lorem ipsum dolor sit amet'
    },
    {
        titulo: 'Cobro en línea',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Tráfico a pagina web',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Automatización respuestas a mensajes',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Enviar masivos de WhatsApp',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Enviar masivos por correo',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Recontactar a prospectos qye ya me contactaron pero no compraron',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Chatbot en mi pagina web',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Chatbot en mi pagina web',
        descripcion: 'Descripción de la solución 3'
    },
    {
        titulo: 'Gestionar a prospectos y clientes',
        descripcion: 'Descripción de la solución 3'
    },
];

export default function SolucionesLista() {
    const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

    const toggleDescripcion = (index: number) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    return (
        <div>
            <div className='mb-5'>
                <h2 className='font-FunnelSans-SemiBold text-2xl bg-gradient-to-r from-blue-400  to-green-500 text-transparent bg-clip-text'>
                    Soluciones cobranza digital
                </h2>
                <p className='text-zinc-300 font-FunnelSans-Light max-w-screen-sm mx-auto mb-3'>
                    Conoce otras soluciones que hemos implementado para otros negocios y que han tenido éxito para aumentar sus ventas.
                </p>
            </div>
            {soluciones.map((solucion, index) => (
                <div key={index} className="px-5 py-3 border border-pink-950 rounded-md mb-3">
                    <div className="flex items-center justify-between"
                        onClick={() => toggleDescripcion(index)} style={{ cursor: 'pointer' }}>

                        <h2 className="bg-gradient-to-r from-pink-500 to-red-500 text-transparent bg-clip-text">
                            {solucion.titulo}
                        </h2>
                        <div className='text-rose-950'>
                            {visibleIndex === index ? '▲' : '▼'}
                        </div>
                    </div>
                    <div
                        className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? 'max-h-40' : 'max-h-0'}`}
                    >
                        <p className="text-sm text-zinc-500 py-3">
                            {solucion.descripcion}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
