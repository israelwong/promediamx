'use client';
import React, { useState } from 'react'
import LeadFormLite from '../LeadFormLite';
import Link from 'next/link';

export default function ContenidoOrganico() {

    const [showModal, setShowModal] = useState(false);
    const asunto = 'Creación de contenido profesional y orgánico para redes sociales.'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <section>
            <header>
                <h1 className='md:text-4xl text-4xl font-FunnelSans-Bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-yellow-500'>
                    {asunto}
                </h1>
            </header>

            <article>
                <p className='text-lg text-zinc-300 mb-5'>
                    Nosotros te ayudamos a comunicar tu oferta de forma clara y atractiva generando contenido que refuerce la confianza y facilite la decisión de compra.
                </p>

                <div className='mb-5 flex'>
                    <ul className='flex gap-4 text-center items-center'>
                        <li>
                            <i className="fab fa-whatsapp text-green-600 text-2xl" aria-label="WhatsApp"></i>
                        </li>
                        <li>
                            <i className="fab fa-tiktok text-2xl" aria-label="TikTok"></i>
                        </li>
                        <li>
                            <i className="fab fa-youtube text-red-700 text-3xl" aria-label="YouTube"></i>
                        </li>
                        <li>
                            <i className="fab fa-facebook-f text-blue-700 text-2xl" aria-label="Facebook"></i>
                        </li>
                        <li>
                            <i className="fab fa-instagram text-pink-800 text-3xl" aria-label="Instagram"></i>
                        </li>
                        <li>
                            <i className="fab fa-linkedin-in text-blue-400 text-2xl" aria-label="LinkedIn"></i>
                        </li>
                    </ul>
                </div>

                <ul className='flex flex-wrap gap-2 md:text-sm text-xs font-light text-zinc-500 mb-5'>
                    <li className='px-2 py-1 border border-yellow-800 text-yellow-700 rounded-full'>Servicios que se incluyen</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Calendario editorial</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Diseño gráfico de anuncios</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Foto y video con teléfono</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Curación y optimización de contenido</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Edición de historias y reels</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Publicación de contenido</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Analítica de rendimiento</li>
                </ul>

                <div className='gap-2 items-center'>
                    <p className='text-zinc-300 text-2xl font-FunnelSans-Light mb-2'>
                        Plan desde $5,000 <span className='text-zinc-500'>/mes</span>
                    </p>
                    <button className='bg-green-800 text-zinc-200 px-4 py-2 rounded-lg mt-2 text-sm'
                        onClick={() => mostrarModalLeadForm()}>
                        Contáctanos hoy mismo
                    </button>
                    <Link href='/servicios/automatizacion-de-respuestas-a-mensajes-en-redes-sociales'>
                        Más detalles
                    </Link>
                </div>

                <p className='text-zinc-500 text-xs font-light mt-5'>
                    * Los planes varían según el alcance y recurrencia de los servicios.
                </p>

                {showModal && <LeadFormLite
                    asunto={asunto}
                    onClose={() => setShowModal(false)}
                />}

            </article>
        </section>
    );
}
