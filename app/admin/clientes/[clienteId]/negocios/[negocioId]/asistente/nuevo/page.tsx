import React from 'react'
import { Metadata } from 'next'
import AsistenteNuevoForm from '../components/AsistenteNuevoForm'

export const metadata: Metadata = {
    title: 'Crear nuevo asistente',
    description: 'Crear nuevo asistente virtual',
}

interface Props {
    negocioId: string
    clienteId: string
}

export default async function Page({ params }: { params: Props }) {
    const { negocioId, clienteId } = await Promise.resolve(params); // Simulate async if needed
    return <AsistenteNuevoForm negocioId={negocioId} clienteId={clienteId} />
}
