import React from 'react'
import { Metadata } from 'next';
import MensajeBienvenida from './components/MensajeBienvenida';

export const metadata: Metadata = {
    title: 'Mensaje Inicial',
    description: 'Configura el mensaje de bienvenida para tus clientes.',
};

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }
) {
    const { negocioId } = await params;
    return <MensajeBienvenida negocioId={negocioId} />
}
