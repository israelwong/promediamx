'use client';
import React, { useState } from 'react'
import LeadFormLite from '@/app/(main)/_components/LeadFormLite';
import LogosRedesSlider from '../_components/LogosRedesSlider';
import Image from 'next/image';

export default function PlanContenidoRedesSociales() {
    const [showModal, setShowModal] = useState(false);
    const asunto = 'Plan de contenido orgánico y profesional para redes sociales'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <>

            <div className='container mx-auto p-5'>

                <section>
                    <header className='py-10 text-center'>

                        <div className='mb-20'>

                            <h2 className='text-4xl font-FunnelSans-Bold text-cyan-500 mb-3'>
                                Creamos <span className='text-orange-500 underline decoration-wavy'>todo</span> el contenido para tus redes sociales
                            </h2>

                            <p className='mb-5 font-FunnelSans-LightItalic text-zinc-200 px-6 text-lg'>
                                Con estrategia, diseño y producción audio visual tanto orgánica como profesional  🚀
                            </p>
                        </div>


                        <div className='mb-20'>
                            <LogosRedesSlider />
                        </div>



                        <div className="text-center text-sm space-x-2 mb-5">
                            <div className="flex items-center gap-2 justify-center">
                                <div>
                                    <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-md border border-none p-[2px] mx-auto mb-2">
                                        <div className="animate-rotate absolute h-full w-full rounded-md bg-[conic-gradient(#FFA500_20deg,transparent_120deg)]" />
                                        <button className="relative z-20 items-center justify-center rounded-md bg-orange-700 px-6 py-3 border border-orange-400 text-white"
                                            onClick={() => mostrarModalLeadForm()}>
                                            <span className="relative z-50 rounded-md py-2 text-center shadow-2xl font-FunnelSans-Bold">
                                                Agenda tu sesión ahora
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className='font-FunnelSans-Light text-lg text-zinc-200 animate-pulse mb-5 italic px-10'>
                            ¡Queremos saber cómo ayudarte! Obtén una consultoría y auditoría inicial sin costo.
                        </p>

                    </header>

                    {/* <div>
                        Contamos con un equipo de expertos en diseño gráfico, producción audiovisual y marketing digital para crear contenido atractivo y efectivo para tus redes sociales.
                    </div> */}

                    <div className='mb-10 border-t border border-green-800 rounded-md p-5 bg-zinc-900/50'>
                        <p className='font-FunnelSans-Bold text-2xl text-zinc-200 mb-3'>
                            ¿En qué consiste?
                        </p>
                        <ul className='list-inside font-FunnelSans-Light space-y-2 mb-5 text-zinc-400'>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Planeación de contenido mensual</span>
                            </li>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Diseño gráfico de anuncios</span>
                            </li>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Creación de contenido en foto y video</span>
                            </li>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Edición y optimización de contenido para post, reels e historias</span>
                            </li>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Publicaciones programadas y optimizadas</span>
                            </li>
                            <li className='flex items-start'>
                                <span>✅</span>
                                <span className='ml-2'>Análisis y ajustes continuos</span>
                            </li>
                        </ul>

                        <p className='font-FunnelSans-Light text-2xl text-zinc-200 mb-3'>
                            Plan todo incluido desde $5,000 /mes
                        </p>

                        <p className='font-FunnelSans-Medium text-sm text-zinc-300'>
                            * Todo el contenido a crear es alineado a los objetivos de tu negocio
                        </p>
                    </div>


                    <div className='mb-10 border border-orange-700 rounded-lg p-5 bg-zinc-900/50'>
                        <h2 className='font-FunnelSans-Bold mb-4 text-orange-800 text-2xl'>
                            ¿Por qué es clave tener contenido profesional en tus redes sociales?
                        </h2>

                        <div className='overflow-x-auto whitespace-nowrap'>
                            <ul className='inline-flex space-x-4'>
                                <li className='inline-block'>
                                    <h4 className='text-zinc-300 mb-1'>
                                        <i className="fas fa-hands-helping"></i> Genera confianza
                                    </h4>
                                    <Image src='/images/rrss-confianza.jpg' width={400} height={300} alt='Imagen profesional' />
                                    <p className='text-sm text-zinc-500'>
                                        Una imagen profesional fortalece tu marca y aumenta las conversiones.
                                    </p>
                                </li>
                                <li className='inline-block'>
                                    <h4 className='text-zinc-300 mb-1'>
                                        <i className="fas fa-street-view"></i> Fideliza a tu audiencia
                                    </h4>
                                    <Image src='/images/rrss-fideliza.jpg' width={400} height={300} alt='Imagen profesional' />
                                    <p className='text-sm text-zinc-500'>
                                        Mantén a tus seguidores con contenido de valor constante y relevante.
                                    </p>
                                </li>
                                <li className='inline-block'>
                                    <h4 className='text-zinc-300 mb-1'>
                                        <i className="fas fa-trophy"></i> Te destáca de la competencia
                                    </h4>
                                    <Image src='/images/rrss-destaca.jpg' width={400} height={300} alt='Imagen profesional' />
                                    <p className='text-sm text-zinc-500'>
                                        Comunicarte con calidad y estrategia te posiciona como líder en tu sector.
                                    </p>
                                </li>
                            </ul>
                        </div>

                    </div>




                    <div className='bg-zinc-900 mb-10 border border-zinc-800 rounded-md p-5'>
                        <p className='font-FunnelSans-Light text-2xl text-zinc-200 mb-5'>
                            Cada negocio es único y sus necesidades también. Construyamos juntos el plan ideal para ti
                        </p>
                        <button className='bg-green-800 text-zinc-200 px-4 py-2 rounded-lg mt-2 text-sm'>
                            Agenda una reunión virtual
                        </button>
                    </div>

                    <div>
                        <h3></h3>


                    </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                        <div>
                            <article>
                                <div className='gap-2 items-center'>
                                    <p className='text-zinc-300 text-2xl font-FunnelSans-Light mb-2'>
                                        Plan desde $5,000 <span className='text-zinc-500'>/mes</span>
                                    </p>

                                    <button className='bg-green-800 text-zinc-200 px-4 py-2 rounded-lg mt-2 text-sm'
                                        onClick={() => mostrarModalLeadForm()}
                                    >
                                        Contáctanos hoy mismo
                                    </button>
                                </div>

                                <footer>
                                    <p className='text-zinc-500 text-xs font-light mt-5'>
                                        * El precio del servicio se calcula y divide hasta en 12 pagos
                                    </p>
                                </footer>
                            </article>
                        </div>

                        <div>
                            Servicios que puedes contratar por separado
                        </div>
                    </div>

                    {showModal && <LeadFormLite
                        asunto={asunto}
                        onClose={() => setShowModal(false)}
                    />}

                </section>
            </div>
        </>
    )
}
