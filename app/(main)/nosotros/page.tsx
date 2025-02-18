import React from 'react'
import { Metadata } from 'next'
import Nosotros from './_components/Nosotros'

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'Conoce más sobre nosotros en Promedia App.',
  keywords: 'nosotros, promedia, empresa, información',
  authors: [{ name: 'Promedia App' }],
  openGraph: {
    title: 'Nosotros',
    description: 'Conoce más sobre nosotros en Promedia App.',
    url: 'https://www.promedia-app.com/nosotros',
    type: 'website',
    images: [
      {
        url: 'https://www.promedia-app.com/images/nosotros.jpg',
        width: 800,
        height: 600,
        alt: 'Nosotros',
      },
    ],
  },
}

export default function page() {
  return <Nosotros />
}
