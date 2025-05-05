import React from 'react'
import { Metadata } from 'next'
import TareaSuscripcion from './component/TareaSuscripcion'

export const metadata: Metadata = {
    title: 'Gestionar suscripción Tarea'
}

interface Props {
    asistenteId: string
    negocioId: string
    clienteId: string
    tareaId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { asistenteId, negocioId, clienteId, tareaId } = await params;
    console.table({ asistenteId, negocioId, clienteId, tareaId });
    return <TareaSuscripcion asistenteId={asistenteId} negocioId={negocioId} clienteId={clienteId} tareaId={tareaId} />
}
