'use client';
import React, { useState } from 'react'
import LeadFormLite from './LeadFormLite';


export default function EmbudoDeVentas() {

    const [showModal, setShowModal] = useState(false);
    const asunto = 'Obtener clientes potenciales usando plataformas digitales.'
    function mostrarModalLeadForm() {
        setShowModal(true);
    }

    return (
        <div>

            <main>
                <section>
                    <h2 className='md:text-4xl text-4xl font-FunnelSans-Bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-red-500'>
                        {asunto}
                    </h2>

                    <p className='text-lg text-zinc-300 mb-5'>
                        Te ayudamos a atraer más clientes potenciales con estrategias en redes sociales, anuncios pagados en Google y la integración de pagos con Stripe.
                    </p>
                </section>

                <section className='mb-5'>
                    <h3 className='sr-only'>Redes Sociales</h3>
                    <ul className='flex gap-4 text-center items-center'>
                        <li>
                            <i className="fab fa-facebook-f text-blue-700 text-2xl" aria-hidden="true"></i>
                            <span className="sr-only">Facebook</span>
                        </li>
                        <li>
                            <i className="fab fa-instagram text-pink-800 text-3xl" aria-hidden="true"></i>
                            <span className="sr-only">Instagram</span>
                        </li>
                        <li>
                            <i className="fab fa-linkedin-in text-blue-400 text-2xl" aria-hidden="true"></i>
                            <span className="sr-only">LinkedIn</span>
                        </li>
                        <li>
                            <i className="fab fa-google text-2xl text-blue-700" aria-hidden="true"></i>
                            <span className="sr-only">Google</span>
                        </li>
                        <li>
                            <i className="fas fa-globe text-2xl text-zinc-400" aria-hidden="true"></i>
                            <span className="sr-only">Website</span>
                        </li>
                        <li>
                            <i className="fab fa-stripe text-blue-600 text-5xl" aria-hidden="true"></i>
                            <span className="sr-only">Stripe</span>
                        </li>
                    </ul>
                </section>

                <section>
                    <h3 className='sr-only'>Servicios Disponibles</h3>
                    <ul className='flex flex-wrap gap-2 md:text-sm text-xs font-light text-zinc-500 mb-5'>
                        <li className='px-2 py-1 border border-red-800 text-rose-900 rounded-full'>Servicios disponibles</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Diseño de campañas</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Diseño gráfico</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Google Ads</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Facebook Ads</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Instagram Ads</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Tiktok Ads</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Email marketing</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Landing page</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Leadforms</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Catálogo de productos</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>CRM</li>
                        <li className='px-2 py-1 bg-zinc-800 rounded-full'>Pasarela de pago</li>
                    </ul>
                </section>

                <section className='gap-2 items-center'>
                    <h3 className='sr-only'>Plan de Precios</h3>
                    <p className='text-zinc-300 text-2xl font-FunnelSans-Light mb-2'>
                        Plan desde $7,000 <span className='text-zinc-500'>/mes</span>
                    </p>

                    <button className='bg-green-800 text-zinc-200 px-4 py-2 rounded-lg mt-2 text-sm'
                        onClick={() => mostrarModalLeadForm()}
                    >
                        Contáctanos hoy mismo
                    </button>
                </section>

                <footer>
                    <p className='text-zinc-500 text-xs font-light mt-5'>
                        Contratación mínima de 6 meses. El precio del servicio varía según la complejidad del embudo de ventas. La agencia cobra una comisión adicional, a negociar, independiente de la comisión de Stripe.
                    </p>
                </footer>


                {showModal && <LeadFormLite
                    asunto={asunto}
                    onClose={() => setShowModal(false)}
                />}


            </main>
        </div>
    );
}
