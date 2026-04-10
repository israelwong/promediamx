import React from 'react'
import { Metadata } from 'next'
import Linktree from './_components/Linktree'

export const metadata: Metadata = {
    title: 'Linktree',
    description: 'Conoce más sobre nosotros en Promedia.',
    keywords: 'Ecosistema digital de Promedia, promedia, empresa, información',
    authors: [{ name: 'Promedia' }],
    openGraph: {
        title: 'Linktree',
        description: 'Conoce más sobre nosotros en Promedia.',
        url: 'https://www.promedia-app.com/linktree',
        type: 'website',
        images: [
            {
                url: 'https://www.promedia-app.com/images/linktree.jpg',
                width: 800,
                height: 600,
                alt: 'Linktree',
            },
        ],
    },
}

export default function page() {
    return <Linktree />
}
