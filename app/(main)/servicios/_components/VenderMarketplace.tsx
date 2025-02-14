'use client';
import React, { useState } from 'react'
import LeadFormLite from '@/app/(main)/_components/LeadFormLite';
import Image from 'next/image'
import Head from 'next/head'

export default function VenderMarketplace() {

    const [showModal, setShowModal] = useState(false);
    const asunto = 'Vender productos en Marketplace de Mercado Libre y Amazon.'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <>
            <Head>
                <title>Vender en Marketplace - Promedia App</title>
                <meta name="description" content="Sube tus productos a Mercado Libre y/o Amazon con nuestra ayuda. Gestionamos todo el proceso para que puedas escalar tu negocio sin complicaciones." />
                <meta name="keywords" content="vender en marketplace, Mercado Libre, Amazon, gestión de ventas, automatización de ventas" />
            </Head>
            <div>
                <header>
                    {/* <p className='font-FunnelSans-SemiBold text-yellow-500 mb-2'>
                        ¿Quieres vender en Marketplace?
                    </p> */}
                    <h1 className='md:text-4xl text-4xl font-FunnelSans-Bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500'>
                        {asunto}
                    </h1>
                </header>

                <main>
                    <p className='text-lg text-zinc-300 mb-5'>
                        Nosotros te ayudamos a: gestionar todo el proceso, desde la creación de publicaciones optimizadas hasta la automatización de ventas y cobros, para que puedas escalar tu negocio sin complicaciones.
                    </p>

                    <div className='mb-5 flex'>
                        <ul className='flex gap-4 text-center items-center'>
                            <li>
                                <i className="fab fa-amazon text-3xl" aria-label="Amazon"></i>
                            </li>
                            <li>
                                <Image src='/icons/mercado-libre.svg' width={100} height={100} alt='Mercado Libre' />
                            </li>
                        </ul>
                    </div>

                    <section>
                        <h2 className='sr-only'>Servicios incluidos</h2>
                        <ul className='flex flex-wrap gap-2 md:text-sm text-xs font-light text-zinc-500 mb-5'>
                            <li className='px-2 py-1 border border-yellow-800 text-yellow-700 rounded-full'>Servicios que se incluyen</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Publicación de productos</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Optimización de publicaciones</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Gestión de pedidos</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Gestión de preguntas</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Pautas publicitarias</li>
                            <li className='px-2 py-1 bg-zinc-800 rounded-full'>Automatización de ventas</li>
                        </ul>
                    </section>

                    <div className='gap-2 items-center'>
                        <p className='text-zinc-300 text-2xl font-FunnelSans-Light mb-2'>
                            Plan desde $8,000 <span className='text-zinc-500'>/mes</span>
                        </p>
                        <button className='bg-green-800 text-zinc-200 px-4 py-2 rounded-lg mt-2 text-sm'
                            onClick={mostrarModalLeadForm}
                        >
                            Contáctanos hoy mismo
                        </button>
                    </div>

                    <footer>
                        <p className='text-zinc-500 text-xs font-light mt-8 md:mb-1'>
                            * Los envios y comisiones de las plataformas no están incluidos en el precio
                        </p>
                    </footer>
                </main>

                {showModal && <LeadFormLite
                    asunto={asunto}
                    onClose={() => setShowModal(false)}
                />}

            </div>
        </>
    )
}
