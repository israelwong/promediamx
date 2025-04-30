import React from 'react'
import { Metadata } from 'next'
import NegocioDashboard from './components/NegocioDashboard'

export const metadata: Metadata = {
    title: 'Negocio',
    description: 'Editar negocio',
}

export default async function page({ params }: { params: Promise<{ negocioId: string, clienteId: string }> }) {
    const { negocioId, clienteId } = await params
    return <NegocioDashboard negocioId={negocioId} clienteId={clienteId} />
}
