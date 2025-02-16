import React from 'react'
import Link from 'next/link'

export default function FichaComoCierroVentas() {
    return (
        <div>
            <div className='bg-zinc-900 border border-zinc-700 rounded-md p-5'>
                <h2 className='font-FunnelSans-Bold text-2xl mb-3 text-blue-600'>
                    Ya tengo contenido en redes, ¿cómo cierro ventas?
                </h2>
                <p className='font-FunnelSans-Light text-zinc-200 mb-5'>
                    Nosotros podemos ayudarte a diseñar tu embudo de ventas digitales e integrar herramientas para agilizar las conversiones:
                </p>

                <ul className='list-inside list-disc font-FunnelSans-Light space-y-5 text-zinc-300 mb-5'>
                    <li className='flex items-start'>
                        <span>🚀</span>
                        <span className='ml-2'>Campañas de marketing digital</span>
                    </li>
                    <li className='flex items-start'>
                        <span>🚀</span>
                        <span className='ml-2'>Landing page omnicanal</span>
                    </li>
                    <li className='flex items-start'>
                        <span>🚀</span>
                        <span className='ml-2'>Automatización de mensajes con respuestas automáticas, incluso enviar links de pago Stripe, Mercado Libre, Amazon o redirigir a tu landing page.</span>
                    </li>
                    <li className='flex items-start'>
                        <span>🚀</span>
                        <span className='ml-2'>Cobros seguros con Stripe: tarjeta, débito y OXXO</span>
                    </li>
                </ul>

                <div>
                    <p className='font-FunnelSans-Light text-xl text-zinc-200 mb-5'>
                        ¿Te interesa algo así? ¡Armemos juntos un plan a tu medida!
                    </p>

                    <Link className='bg-blue-800 text-zinc-200 px-4 py-3 rounded-lg mt-2 text-sm md:mb-5 inline-block'
                        href={'https://calendly.com/promediamx/30min'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Agenda una reunión virtual"
                    >
                        Agenda una reunión virtual
                    </Link>
                </div>
            </div>
        </div>
    )
}
