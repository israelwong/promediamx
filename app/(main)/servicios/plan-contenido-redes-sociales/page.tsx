import React from 'react'
import { Metadata } from 'next';
import PlanContenidoRedesSociales from './PlanContenidoRedesSociales';

export const metadata: Metadata = {
    title: 'Plan de contenido para redes sociales',
    description: 'Ofrecemos creación de contenido atractivo y efectivo para redes sociales, ideal para empresas que buscan expandir su presencia en plataformas digitales.',
    metadataBase: new URL('https://promedia.mx'),
    openGraph: {
        title: 'Contenido para Redes Sociales - ProMedia',
        description: 'Ofrecemos creación de contenido atractivo y efectivo para redes sociales, ideal para empresas que buscan expandir su presencia en plataformas digitales.',
        url: 'https://promedia.mx/servicios/plan-contenido-redes-sociales',
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
    return <PlanContenidoRedesSociales />;
}
