// app/admin/marketplace/suscripcion/[tareaId]/page.tsx
import React from 'react'
import { Metadata } from 'next'
import SuscripcionTareaDetalle from './components/SuscripcionTareaDetalle'

export const metadata: Metadata = {
    title: 'Suscripción a una nueva tarea',
    description: 'Suscripción a una nueva tarea'
}

interface Props {
    tareaId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { tareaId } = await params
    return <SuscripcionTareaDetalle
        tareaId={tareaId}
    />
}
