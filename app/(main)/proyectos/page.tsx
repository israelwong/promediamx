import React from 'react'
import { Metadata } from 'next'
import Proyectos from './_components/Proyectos'

export const metadata: Metadata = {
    title: 'Proyectos | ProMedia',
    description: 'Conoce los proyectos que hemos realizado en ProMedia.',
    metadataBase: new URL('https://promedia.mx/proyectos'),
    openGraph: {
        title: 'Proyectos | ProMedia',
        description: 'Conoce los proyectos que hemos realizado en ProMedia.',
        url: 'https://promedia.mx/proyectos',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Proyectos | ProMedia',
        description: 'Conoce los proyectos que hemos realizado en ProMedia.',
    },
};

export default function Page() {
    return <Proyectos />
}
