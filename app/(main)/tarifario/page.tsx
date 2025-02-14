import React from 'react'
import { Metadata } from 'next'
import Tarifario from './_components/Tarifario'

export const metadata: Metadata = {
    title: 'Tarifario | ProMedia',
    description: 'Conoce nuestros precios y contrata los servicios de ProMedia.',
    metadataBase: new URL('https://promedia.mx/tarifario'),
    openGraph: {
        title: 'Tarifario | ProMedia',
        description: 'Conoce nuestros precios y contrata los servicios de ProMedia.',
        url: 'https://promedia.mx/tarifario',
        siteName: 'ProMedia',
        images: [
            {
                url: 'https://promedia.mx/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'ProMedia',
            },
        ],
        locale: 'es_MX',
        type: 'website',
    }
};

export default function page() {
    return <Tarifario />
}
