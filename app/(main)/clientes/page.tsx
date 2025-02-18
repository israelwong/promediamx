import React from 'react'
import { Metadata } from 'next'
import Clientes from './_components/Clientes'

export const metadata: Metadata = {
    title: 'Clientes',
    description: 'Conoce a nuestros clientes en Promedia App.',
    keywords: 'clientes, promedia, empresa, información',
    authors: [{ name: 'Promedia App' }],
    openGraph: {
        title: 'Clientes',
        description: 'Conoce a nuestros clientes en Promedia App.',
        url: 'https://www.promedia-app.com/clientes',
        type: 'website',
        images: [
            {
                url: 'https://www.promedia-app.com/images/clientes.jpg',
                width: 800,
                height: 600,
                alt: 'Clientes',
            },
        ],
    },
}

export default function page() {
    return <Clientes />
}
