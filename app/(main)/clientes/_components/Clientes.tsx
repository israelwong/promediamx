'use client'
import React from 'react'
import LogosClientes from '../../_components/LogosClientes';
import VideoPlayer from '../../_components/VideoPlayer';
import LogosClientesSlider from '../../_components/LogosClientesSlider';

export default function Clientes() {
    return (
        <div className='container max-w-screen-lg mx-auto px-4 py-8'>

            {/* <div className='mb-5 md:hidden'>
                <LogosClientesSlider />
            </div> */}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-5 mb-6'>

                <VideoPlayer
                    src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/videos/reel2024_1min_SD.webm?t=2024-09-27T18%3A17%3A22.773Z"
                    muted={false}
                    controls={true}
                />

                <div className='md:border-l border-zinc-500 md:pl-4 justify-center items-center text-zinc-300
                md:bg-transparent bg-zinc-900/30 p-4 md:rounded-none rounded-lg'>
                    <h2 className='text-3xl font-FunnelSans-Bold mb-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-transparent bg-clip-text'>
                        A todos nuestros clientes
                    </h2>
                    <p className='font-FunnelSans-Regular mb-4'>
                        Agradecemos profundamente la confianza de nuestros clientes. Es un honor ser parte de su crecimiento y seguir generando juntos grandes resultados.
                    </p>
                    <ul className='list-disc list-inside'>
                        <li>Gobierno</li>
                        <li>Instituciones educativas</li>
                        <li>Inmobiliarias</li>
                        <li>PyMES</li>
                        <li>Emprendedores</li>
                    </ul>
                </div>

            </div>

            <div className='mb-5 '>
                <LogosClientesSlider />
            </div>

            <LogosClientes />
        </div>
    )
}
