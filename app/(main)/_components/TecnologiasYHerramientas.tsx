'use client'
import React from 'react'
import Head from 'next/head'

export default function TecnologiasYHerramientas() {
    return (
        <>
            <Head>
                <title>Herramientas, tecnologías y plataformas - Promedia App</title>
                <meta name="description" content="Usamos herramientas de última generación para implementar en tu estrategias para que puedas alcanzar tus objetivos." />
                <meta name="keywords" content="Frontend, Backend, DevOps, Automatización conversacional, Marketing digital, SEO, Ads, Marketplaces" />
            </Head>

            <main className='p-5 border border-blue-900 rounded-md border-dotted' aria-label="Tecnologías y herramientas">
                <header className='mb-5 max-w-screen-sm '>
                    <h1 className='font-FunnelSans-SemiBold md:text-3xl text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-green-500 mb-2'>
                        Herramientas, tecnologías y plataformas
                    </h1>
                    <p className='text-zinc-400 font-FunnelSans-Light mx-auto mb-5 md:text-lg'>
                        Usamos las herramientas y tecnologías más optimas para implementar en tu negocio y puedas alcanzar tus objetivos.
                    </p>
                </header>

                <section className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:space-y-0 space-y-5 md:gap-1'>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Frontend</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            NextJS, Typescript, ReactJS, Tailwind
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Backend</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            NodeJS, Supabase, Postgrestql, Prisma
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> DevOps</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Vercel, GitHub
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Automatización conversacional</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Manychat, Message Bird, Mailchimp
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Marketing digital</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Google Analytics, Facebook Pixel, Google Tag Manager
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> SEO</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Google Search Console, Google My Business
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Ads</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Google Ads, Facebook Ads, Instagram Ads, Tiktok Ads, Spotify Ads
                        </p>
                    </article>

                    <article className='md:p-5 md:px-5 pd:py-3 ml-2 md:ml-0'>
                        <h2 className='font-FunnelSans-Regular md:text-xl text-blue-400'><i className="fas fa-caret-right"></i> Marketplaces</h2>
                        <p className='text-zinc-600 font-FunnelSans-Light'>
                            Amazon, Mercado libre
                        </p>
                    </article>
                </section>
            </main>
        </>
    )
}
