import React from 'react'

export default function FichaPlanCreacionContenido() {
    return (
        <div className='col-span-1 border border-green-800 rounded-md p-5 bg-zinc-900/50'>

            <div className='mb-3'>
                <h3 className='font-FunnelSans-Bold text-2xl text-green-500 mb-2'>
                    ¿Qué servicios incluye un plan todo incluido?
                </h3>
                <p className='font-FunnelSans-Light text-lg text-zinc-500'>
                    Estos servicios forman parte de un plan de creación de contenido:
                </p>
            </div>

            <ul className='list-inside font-FunnelSans-Light space-y-2 mb-5 text-zinc-300'>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Reunión mensual para definir objetivos y promociones.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Planeación de contenido mensual.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Diseño gráfico de anuncios multiformato.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Creación de contenido en foto y video.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Edición y optimización de contenido para post, reels e historias.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Publicaciones programadas y optimizadas.</span>
                </li>
                <li className='flex items-start'>
                    <span>✅</span>
                    <span className='ml-2'>Análisis y ajustes continuos.</span>
                </li>
            </ul>

            <p className='font-FunnelSans-Light text-2xl text-zinc-200 mb-3'>
                Plan desde $5,000/mes*
            </p>

            <p className='font-FunnelSans-Light text-sm text-zinc-500 italic'>
                * Precio sujeto a cantidad y reccurrencia de creación de contenido y cantidad de plataformas.
            </p>

        </div>
    )
}
