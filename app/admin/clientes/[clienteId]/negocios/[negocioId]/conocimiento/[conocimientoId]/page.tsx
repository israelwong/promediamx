import React from 'react'
import { Metadata } from 'next'
import ConocimientoForm from '../components/ConocimientoForm'

export const metadata: Metadata = {
    title: 'Nuevo Conocimiento',
    description: 'Crea un nuevo ítem de conocimiento para tu negocio.',
}

interface Props {
    negocioId: string;
    clienteId: string; // Necesario para la navegación
    conocimientoId?: string; // Opcional: si está presente, estamos en modo edición.
}

export default async function ConocimientoEditarPage({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId, conocimientoId } = await params
    console.log(`Cargando página de edición de conocimiento para Negocio: ${negocioId}, Cliente: ${clienteId}, Item: ${conocimientoId}`)
    return <ConocimientoForm
        negocioId={negocioId}
        clienteId={clienteId}
        itemId={conocimientoId} // Puede ser undefined si es un nuevo ítem
    />
}
