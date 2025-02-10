'use client';
import React, { useState } from 'react'
import LeadFormLite from './LeadFormLite';

export default function BuscasOtraSolucion() {

    const [showModal, setShowModal] = useState(false);
    const asunto = 'Quiero una asesoría sobre las soluciones que puedo implementar en mi negocio.'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <section aria-labelledby="solution-heading" className='bg-zinc-900/20 py-10 px-5'>
            <header className="text-center mb-5">
                <h3 id="solution-heading" className="font-FunnelSans-SemiBold text-zinc-200 text-3xl mb-3">
                    ¿Buscas una solución diferente?
                </h3>
            </header>

            <p className="text-zinc-300 font-FunnelSans-Light text-lg max-w-screen-sm mx-auto mb-5">
                Contáctanos hoy mismo para platicar sobre tus necesidades y encontrar la mejor solución para tu negocio.
            </p>

            <div className="text-center text-sm space-x-2">
                <div className="flex items-center gap-2 justify-center">
                    <button aria-label="Llama ahora" className="bg-zinc-800 border border-zinc-700 text-white py-2 px-6 rounded-md">
                        Llama ahora
                    </button>
                    <div>
                        <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-md border border-none p-[1.5px] mx-auto">
                            <div className="animate-rotate absolute h-full w-full rounded-md bg-[conic-gradient(#22c55e_20deg,transparent_120deg)]"></div>
                            <button aria-label="Enviar mensaje" className="relative z-20 items-center justify-center rounded-md bg-green-800 px-6 py-2 border border-green-600 text-white"
                                onClick={mostrarModalLeadForm}
                            >
                                <span className="relative z-50 rounded-md py-2 text-center shadow-2xl text-sm">
                                    Enviar mensaje
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className='text-left'>
                {showModal && <LeadFormLite
                    asunto={asunto}
                    onClose={() => setShowModal(false)}
                />}
            </div>
        </section>
    )
}
