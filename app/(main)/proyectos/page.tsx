import React from 'react'
import { Metadata } from 'next'
import Proyectos from './_components/Proyectos'

export const metadata: Metadata = {
    title: 'Proyectos',
    description: 'Conoce los proyectos que hemos realizado en ProMedia.',
    metadataBase: new URL('https://promedia.mx/proyectos'),
    openGraph: {
        title: 'Proyectos',
        description: 'Conoce los proyectos que hemos realizado en ProMedia.',
        url: 'https://promedia.mx/proyectos',
        type: 'website',
    }
};

export default function Page() {
    return <Proyectos />
}
