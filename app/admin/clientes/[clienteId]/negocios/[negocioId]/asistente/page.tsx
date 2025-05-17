import React from 'react'
import { Metadata } from 'next'

import AsistenteConfig from './components/AsistenteConfig';

export const metadata: Metadata = {
    title: 'Asistente',
    description: 'Asistente de configuración',
}

interface Props {
    clienteId: string;
    negocioId: string;
}


export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params
    return <AsistenteConfig clienteId={clienteId} negocioId={negocioId} />
}
