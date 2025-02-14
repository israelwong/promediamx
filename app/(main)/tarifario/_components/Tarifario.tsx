import React from 'react'

export default function Tarifario() {

    const catalogo = [
        {
            categoria: 'Automatización de respuestas a mensajes en redes sociales',
            servicios: [

                {
                    nombre: 'Automatización de respuestas a mensajes en redes sociales',
                    descripcion: 'Automatiza tu atención al cliente 24/7 en WhatsApp, Instagram, Facebook o TikTok, ahorra tiempo, aumenta ventas y monitoreamos tus contactos para evitar costos extra; ¡prueba gratis por 7 días!',
                    precio: 2500,
                    comentarios: 'Precio por red social. Red social adicional $1,500. No incluye costo por campañas de publicidad',
                },
                {
                    nombre: 'Cobrar en línea con TD/TC, MSI y OXXO',
                    descripcion: 'Olvídate de las terminales bancarias y obtén una solución flexible y escalable para aceptar pagos online en tu sitio web, landing page o redes sociales. Con nuestra pasarela de pagos Stripe, puedes aceptar pagos con tarjetas, OXXO y más, sin costos de instalación ni comisiones ocultas.',
                    precio: 2000,
                    comentarios: 'Sin costo de implementación. Stripe cobra una comisión fija + comisión variable por transacción según método de pago',
                },
                {
                    nombre: 'Pagina web básica para captar clientes',
                    descripcion: 'Te ofrecemos una landing page personalizada con un leadform integrado, diseñado para captar interesados y generar oportunidades de negocio. Los leads generados serán enviados en tiempo real a tu WhatsApp y podrás consultarlos en tu web app de manera fácil y rápida.',
                },
            ]
        },
        {
            categoria: 'Automatización de respuestas a mensajes en redes sociales',
            servicios: [

                {
                    nombre: 'Automatización de respuestas a mensajes en redes sociales',
                    descripcion: 'Automatiza tu atención al cliente 24/7 en WhatsApp, Instagram, Facebook o TikTok, ahorra tiempo, aumenta ventas y monitoreamos tus contactos para evitar costos extra; ¡prueba gratis por 7 días!',
                    precio: 2500,
                    comentarios: 'Precio por red social. Red social adicional $1,500. No incluye costo por campañas de publicidad',
                },
                {
                    nombre: 'Cobrar en línea con TD/TC, MSI y OXXO',
                    descripcion: 'Olvídate de las terminales bancarias y obtén una solución flexible y escalable para aceptar pagos online en tu sitio web, landing page o redes sociales. Con nuestra pasarela de pagos Stripe, puedes aceptar pagos con tarjetas, OXXO y más, sin costos de instalación ni comisiones ocultas.',
                    precio: 2000,
                    comentarios: 'Sin costo de implementación. Stripe cobra una comisión fija + comisión variable por transacción según método de pago',
                },
                {
                    nombre: 'Pagina web básica para captar clientes',
                    descripcion: 'Te ofrecemos una landing page personalizada con un leadform integrado, diseñado para captar interesados y generar oportunidades de negocio. Los leads generados serán enviados en tiempo real a tu WhatsApp y podrás consultarlos en tu web app de manera fácil y rápida.',
                },
            ]
        }
    ]

    return (
        <div className='container mx-auto max-w-screen-xl py-10'>

            <h1 className='font-FunnelSans-SemiBold text-3xl  mb-2'>
                Tarifario
            </h1>

            <p className='font-FunnelSans-Regular text-lg mb-6'>
                Conoce nuestros servicios y precios
            </p>
            <ul className='space-y-6'>
                {catalogo.map((categoria, catIndex) => (
                    <div key={catIndex}>
                        <h2 className='font-FunnelSans-SemiBold text-2xl mb-4'>
                            {categoria.categoria}
                        </h2>
                        {categoria.servicios.map((servicio, index) => (
                            <li key={index} className='p-4 bg-zinc-900 shadow-md rounded-lg'>
                                <h3 className='font-FunnelSans-SemiBold text-xl mb-2'>
                                    {servicio.nombre}
                                </h3>
                                <p className='font-FunnelSans-Regular text-base mb-4'>
                                    {servicio.descripcion}
                                </p>
                                {servicio.precio && (
                                    <p className='font-FunnelSans-Regular text-base mb-4'>
                                        Precio: ${servicio.precio}
                                    </p>
                                )}
                                {servicio.comentarios && (
                                    <p className='font-FunnelSans-Regular text-base mb-4'>
                                        {servicio.comentarios}
                                    </p>
                                )}
                            </li>
                        ))}
                    </div>
                ))}
            </ul>

        </div>
    )
}
