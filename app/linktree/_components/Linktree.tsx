'use client';
import React from 'react'
import Link from 'next/link'
import Footer from '@/app/(main)/_components/Footer'
import Image from 'next/image'
import LogosClientesSlider from '@/app/(main)/_components/LogosClientesSlider'
import { TypeAnimation } from 'react-type-animation';

export default function Linktree() {

    const links = [
        { name: 'Pagina Web', url: '/', icon: '<i class="fas fa-globe"></i>' },
        { name: 'Facebook', url: '/nosotros', icon: '<i class="fab fa-facebook-f"></i>', title: 'Facebook' },
        { name: 'Instagram', url: '/proyectos', icon: '<i class="fab fa-instagram"></i>', title: 'Instagram' },
        { name: 'LinkedIn', url: '/linktree', icon: '<i class="fab fa-linkedin-in"></i>' },
        { name: 'YouTube', url: '/linktree', icon: '<i class="fab fa-youtube"></i>' },
    ]

    return (
        <div className='bg-zinc-900/80 min-h-screen'>
            <div className='md:max-w-screen-md mx-auto text-center p-5'>
                <div className='mt-5 mb-2 flex justify-center '>
                    <Image className="" src='https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/promedia/favicon_color.svg' width={40} height={40} alt='Logo' />
                </div>

                <p className="text-xl font-FunnelSans-Light text-zinc-200 mb-5">
                    ProMedia México
                </p>
            </div>


            <header className='mb-5 text-center md:p-5 rounded-md'>
                <div className='md:max-w-screen-md mx-auto'>
                    <p className='md:font-FunnelSans-Regular md:text-3xl  text-yellow-300 mb-2'>
                        Somos una agencia especializada en
                    </p>


                    <div className="md:text-lg text-xs text-zinc-400 font-FunnelSans-Bold">
                        <TypeAnimation
                            sequence={
                                [
                                    'Marketing digital',
                                    1000,
                                    'Content marketing',
                                    1000,
                                    'Publicidad en redes sociales',
                                    1000,
                                    'Pasarelas de pago',
                                    1000,
                                    'Diseño web',
                                    1000,
                                ]}
                            speed={50}
                            style={{ fontSize: '2em' }}
                            repeat={Infinity}
                        />
                    </div>

                </div>
            </header>
            {/* <LogosClientesSlider /> */}

            <div className='md:max-w-screen-sm md:px-20 mx-auto text-zinc-300 p-5 text-center'>
                <ul className='space-y-4'>
                    {links.map((link, index) => (
                        <li key={index} className='w-full p-3 border border-zinc-500 rounded-full text-sm'>
                            <a href={link.url} title={link.title} className='flex items-center justify-center space-x-2 hover:text-yellow-300'>
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>

            <div className='py-6 text-center text-zinc-600'>
                <p className='text-sm mb-3'>Nuestros clientes</p>
                <LogosClientesSlider />
            </div>


            <div className='md:max-w-screen-md mx-auto text-center p-5'>
                <p className='mb-2'>
                    ¿Necesitas ayuda con tu proyecto digital?
                </p>
                <div className="text-center text-sm space-x-2">
                    <div className="flex items-center gap-2 justify-center">
                        <div>
                            <div className="relative z-10 flex cursor-pointer overflow-hidden rounded-md border border-none p-[1.5px] mx-auto">
                                <div className="animate-rotate absolute h-full w-full rounded-md bg-[conic-gradient(#22c55e_20deg,transparent_120deg)]"></div>
                                <Link className="relative z-20 items-center justify-center rounded-md bg-green-800 px-6 py-2 border border-green-600 text-white"
                                    href={'https://calendly.com/promediamx/30min'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Agenda una reunión virtual"
                                >
                                    <span className="relative z-50 rounded-md py-2 text-center shadow-2xl text-sm">
                                        Contactanos hoy mismo
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            <Footer />

        </div>
    )
}
