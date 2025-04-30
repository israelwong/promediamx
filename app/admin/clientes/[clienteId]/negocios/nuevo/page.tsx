import React from 'react'
import { Metadata } from 'next'
import NegocioNuevoForm from '../components/NegocioNuevoForm'

export const metadata: Metadata = {
    title: 'Crear Negocio',
    description: 'Crear Nuevo negocio',
}

export default async function page({ params }: { params: Promise<{ clienteId: string }> }) {
    const { clienteId } = await params
    return <NegocioNuevoForm clienteId={clienteId} />
}
