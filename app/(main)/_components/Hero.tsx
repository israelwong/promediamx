'use client';
import React, { useState } from 'react'
import LeadFormLite from './LeadFormLite';

export default function Hero() {

  const [showModal, setShowModal] = useState(false);
  function mostrarModalLeadForm() {
    setShowModal(true);
  }

  return (
    <section className="max-w-screen-md mx-auto">
      <header className="text-center mb-5">
        <h1 className="font-FunnelSans-Bold md:text-6xl text-4xl text-zinc-200">
          Implementamos soluciones
        </h1>
        <h2 className="text-yellow-300 font-FunnelSans-Medium md:text-5xl text-3xl">
          digitales para tu negocio
        </h2>
      </header>

      <p className="text-center md:text-2xl mt-4 md:px-24 px-3 font-light leading-relaxed font-FunnelSans-Light text-zinc-200 mb-8">
        No te compliques, vayamos al punto.
        ¿Qué necesita el tuyo para <span className='text-yellow-500 leading-3 underline'>cerrar</span> más ventas?
      </p>

      <div className="text-center text-sm space-x-2">
        <div className="flex items-center gap-2 justify-center">
          <button className="bg-zinc-800 border border-zinc-700 text-white py-2 px-6 rounded-md"
            onClick={() => window.open('tel:+525544546582')}>
            Llama ahora
          </button>
          <div>
            <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-md border border-none p-[1.5px] mx-auto">
              <div className="animate-rotate absolute h-full w-full rounded-md bg-[conic-gradient(#22c55e_20deg,transparent_120deg)]"></div>
              <button className="relative z-20 items-center justify-center rounded-md bg-green-800 px-6 py-2 border border-green-600 text-white"
                onClick={() => mostrarModalLeadForm()}>
                <span className="relative z-50 rounded-md py-2 text-center shadow-2xl text-sm">
                  Enviar mensaje
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && <LeadFormLite
        asunto="Quiero más información sobre las soluciones digitales"
        onClose={() => setShowModal(false)}
      />}


    </section>
  )
}
