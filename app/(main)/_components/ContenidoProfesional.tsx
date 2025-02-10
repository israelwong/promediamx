'use client';
import React, { useState } from 'react'
import LeadFormLite from './LeadFormLite';

export default function ContenidoProfesional() {

    const [showModal, setShowModal] = useState(false);
    const asunto = 'Creación de imagen profesional para destacar en el sector.'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <section>
            <header>
                <h1 className='md:text-4xl text-4xl font-FunnelSans-Bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-500'>
                    {asunto}
                </h1>
            </header>

            <article>
                <p className='text-lg text-zinc-300 mb-5'>
                    Te ayudamos a construir una imagen sólida con diseño web, producción audiovisual para destacar tu marca y posicionarte como líder en tu industria.
                </p>

                <div className='mb-5 flex'>
                    <ul className='flex gap-4 text-center items-center'>
                        <li>
                            <i className="fab fa-google text-2xl" aria-label="Google"></i>
                        </li>
                        <li>
                            <i className="fas fa-globe text-2xl" aria-label="Globe"></i>
                        </li>
                        <li>
                            <i className="fas fa-camera text-2xl" aria-label="Camera"></i>
                        </li>
                        <li>
                            <i className="fas fa-video text-2xl" aria-label="Video"></i>
                        </li>
                        <li>
                            <i className="fas fa-play text-2xl" aria-label="Play"></i>
                        </li>
                        <li>
                            <i className="fas fa-image text-2xl" aria-label="Image"></i>
                        </li>
                    </ul>
                </div>

                <ul className='flex flex-wrap gap-2 md:text-sm text-xs font-light text-zinc-500 mb-5'>
                    <li className='px-2 py-1 border border-blue-800 text-sky-700 rounded-full'>Servicios disponibles</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Identidad gráfica</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Diseño gráfico</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Diseño de sitio web</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Dominio</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Hosting</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Optimización SEO para buscadores</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Correo electrónico</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Video promocional</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Video corporativo</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Foto de producto</li>
                    <li className='px-2 py-1 bg-zinc-800 rounded-full'>Foto de arquitectura</li>
                </ul>

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
                        * El precio del servicio se calcula y divide en a pagos
                    </p>
                </footer>
            </article>

            {showModal && <LeadFormLite
                asunto={asunto}
                onClose={() => setShowModal(false)}
            />}


        </section>
    )
}
