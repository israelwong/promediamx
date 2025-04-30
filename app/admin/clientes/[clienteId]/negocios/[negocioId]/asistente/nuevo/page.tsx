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

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params; // Simulate async if needed
    return <AsistenteNuevoForm negocioId={negocioId} clienteId={clienteId} />
}
