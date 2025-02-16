'use client';
import React from 'react'
import { TypeAnimation } from 'react-type-animation';
import Link from 'next/link';


export default function Hero() {

  return (
    <section className="max-w-screen-md mx-auto">
      <header className="text-center mb-16">
        <h1 className="font-FunnelSans-Bold md:text-6xl text-3xl text-zinc-200">
          Soluciones integrales
        </h1>
        <h2 className="text-yellow-300 font-FunnelSans-Medium md:text-5xl text-2xl mb-2">
          en marketing digital para
        </h2>

        <div className="md:text-lg text-xs text-zinc-200 font-FunnelSans-Bold">
          <TypeAnimation
            sequence={
              [
                'crear contenido',
                1000,
                'atraer más clientes',
                1000,
                'cerrar más ventas',
                1000,
                'comunicar valor',
                1000,
              ]}
            speed={50}
            style={{ fontSize: '2em' }}
            repeat={Infinity}
          />
        </div>

      </header>


      <div className="text-center text-sm space-x-2">
        <div className="flex items-center gap-2 justify-center">
          <div>
            <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-md border border-none p-[1.5px] mx-auto">
              <div className="animate-rotate absolute h-full w-full rounded-md bg-[conic-gradient(#22c55e_20deg,transparent_120deg)]"></div>
              <Link className="relative z-20 items-center justify-center rounded-md bg-green-800 px-6 py-2 border border-green-600 text-white"
                href={'https://calendly.com/promediamx/30min'}
                target="_blank"
                rel="noopener noreferrer"
                title="Agenda una reunión virtual"
              >
                <span className="relative z-50 rounded-md py-2 text-center shadow-2xl text-sm">
                  Agendar una reunión virtual
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}
