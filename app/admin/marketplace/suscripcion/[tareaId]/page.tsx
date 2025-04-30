import React from 'react'
import { Metadata } from 'next'
import SuscripcionTareaDetalle from '../components/SuscripcionTareaDetalle'

export const metadata: Metadata = {
    title: 'Suscripción a una nueva tarea',
    description: 'Suscripción a una nueva tarea'
}

export default async function page({ params }: { params: Promise<{ tareaId: string }> }) {
    const { tareaId } = await params
    return <SuscripcionTareaDetalle tareaId={tareaId} />
}
