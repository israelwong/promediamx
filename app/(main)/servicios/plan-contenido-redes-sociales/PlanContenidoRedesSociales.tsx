'use client';
import React, { useState } from 'react'
import LeadFormLite from '@/app/(main)/_components/LeadFormLite';
import LogosRedesSlider from '../_components/LogosRedesSlider';
import FichaBeneficiosContenidoRRSS from '../../_components/FichaBeneficiosContenidoRRSS';
import FichaComoCierroVentas from '../../_components/FichaComoCierroVentas';
import VentajasCompetitivas from '../../_components/VentajasCompetitivas';
import FichaPlanCreacionContenido from '../_components/FichaPlanCreacionContenido';
import FichaMaximizaPotencialRRSS from '../../_components/FichaMaximizaPotencialRRSS';
import FichaPorquePagarCreacionRRSS from '../../_components/FichaPorquePagarCreacionRRSS';


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

                    {/* HEADER */}
                    <header className='md:py-10 py-12 text-center'>
                        <div className='mb-20 max-w-screen-sm mx-auto md:px-16'>

                            <h2 className='md:text-4xl text-4xl font-FunnelSans-Bold text-white mb-3'>
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

                        <p className='font-FunnelSans-Light text-lg text-zinc-200 mb-5 italic md:px-16 px-5 max-w-screen-sm mx-auto'>
                            Te gustaría saber como nuestros servicios pueden ayudar a tu negocio! <span className='animate-pulse '>Agenda una consultoría y auditoría sin costo</span>.
                        </p>
                    </header>

                    <div className='grid grid-cols-1 md:grid-cols-4 gap-5 mb-5'>

                        {/* SERVICIOS QUE SE INCLUYEN */}
                        <div>
                            <FichaPlanCreacionContenido />
                        </div>
                        {/* VENTAJAS DE TENER CONTENIDO */}

                        <div className='col-span-1 md:col-span-1'>
                            <FichaMaximizaPotencialRRSS />
                            <FichaPorquePagarCreacionRRSS />
                        </div>
                        <div>
                        </div>

                        <div>
                            {/* ¿Y ahora cómo cierro ventas? */}
                        </div>

                    </div>

                    <div className='mb-10 grid grid-cols-1 md:grid-cols-4 gap-5'>
                        <div className='col-span-1 md:col-span-1'>
                            <FichaComoCierroVentas />
                        </div>
                        <div className='col-span-1 md:col-span-1'>

                            <FichaBeneficiosContenidoRRSS />
                        </div>
                        <div className='col-span-1 md:col-span-2'>
                            <VentajasCompetitivas />
                        </div>
                    </div>





                    {showModal && <LeadFormLite
                        asunto={asunto}
                        onClose={() => setShowModal(false)}
                    />}

                </section >
            </div >
        </>
    )
}
