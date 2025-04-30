import React from 'react'
import { Metadata } from 'next'
import AsistentePanel from '../components/AsistentePanel'

export const metadata: Metadata = {
    title: 'Detalles del Asistente',
    description: 'Asistente virtual',
}

interface Props {
    negocioId: string
    clienteId: string
    asistenteId: string
}

export default async function Page({ params }: { params: Props }) {
    const { negocioId, clienteId, asistenteId } = await Promise.resolve(params)
    return (
        <AsistentePanel
            negocioId={negocioId}
            clienteId={clienteId}
            asistenteId={asistenteId}
        />
    )
}
