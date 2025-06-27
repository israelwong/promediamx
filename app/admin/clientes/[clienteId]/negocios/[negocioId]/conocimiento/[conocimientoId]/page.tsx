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
    itemId?: string; // Opcional: si está presente, estamos en modo edición.
}

export default async function ConocimientoEditarPage({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId, itemId } = await params
    return <ConocimientoForm
        negocioId={negocioId}
        clienteId={clienteId}
        itemId={itemId} // Puede ser undefined si es un nuevo ítem
    />
}
