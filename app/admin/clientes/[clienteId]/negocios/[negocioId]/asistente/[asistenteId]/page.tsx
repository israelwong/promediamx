import React from 'react'
import { Metadata } from 'next'
import AsistentePanel from '../components/AsistentePanel'

export const metadata: Metadata = {
    title: 'Detalles del Asistente',
    description: 'Asistente virtual',
}


export default async function page({ params }: { params: Promise<{ clienteId: string; negocioId: string; asistenteId: string }> }) {
    const { clienteId, negocioId, asistenteId } = await params;
    return (
        <AsistentePanel
            negocioId={negocioId}
            clienteId={clienteId}
            asistenteId={asistenteId}
        />
    );
}
