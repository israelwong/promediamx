import React from 'react'
import { useState } from "react";
import { CircleHelp } from "lucide-react";

export default function FAQ() {

    const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
    const toggleDescripcion = (index: number) => {
        setVisibleIndex(visibleIndex === index ? null : index);
    };

    const faqs = [
        { pregunta: '¿Cuánto cuesta una sesión de fotos?', respuesta: 'El costo de una sesión de fotos depende de varios factores, como la duración de la sesión, el número de locaciones, el número de personas a fotografiar, entre otros. Contáctanos para obtener un presupuesto personalizado.' },
        { pregunta: '¿Cuánto cuesta una sesión de video?', respuesta: 'El costo de una sesión de video depende de varios factores, como la duración de la sesión, el número de locaciones, el número de personas a grabar, entre otros. Contáctanos para obtener un presupuesto personalizado.' },
        { pregunta: '¿Cuánto cuesta un paquete?', respuesta: 'El costo de un paquete depende de los servicios incluidos, la duración y otros factores. Contáctanos para obtener un presupuesto personalizado.' },
        { pregunta: '¿Ofrecen descuentos?', respuesta: 'Ofrecemos descuentos en ciertas temporadas y para eventos especiales. Contáctanos para más información.' },
    ];

    return (
        <div className='p-5'>

            <h3 className="text-xl font-FunnelSans-Light mb-4 flex items-center space-x-2">
                <CircleHelp size={16} />
                <span>
                    Preguntas frecuentes
                </span>
            </h3>

            {faqs.map((faq, index) => (
                <article key={index} className="px-5 py-3 border border-zinc-800 rounded-md mb-3"
                    onClick={() => toggleDescripcion(index)} style={{ cursor: 'pointer' }}>

                    <header className="flex items-center justify-between">
                        <h2 className="bg-gradient-to-r from-zinc-300 to-zinc-400 text-transparent bg-clip-text">
                            {faq.pregunta}
                        </h2>
                        <div className='text-zinc-300'>
                            {visibleIndex === index ? '▲' : '▼'}
                        </div>
                    </header>
                    <div
                        className={`transition-max-height duration-500 ease-in-out overflow-hidden ${visibleIndex === index ? 'max-h-80' : 'max-h-0'}`}
                    >
                        <p className="text-sm text-zinc-500 pt-2">
                            {faq.respuesta}
                        </p>
                    </div>
                </article>
            ))}
        </div>
    )
}
