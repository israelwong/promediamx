import React from 'react'
import { Metadata } from 'next'
import ListaPaquetes from './components/ListaPaquetes';

export const metadata: Metadata = {
    title: 'Gestionar Paquetes',
    description: 'Editar paquete',
}

interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params
    return (
        <div>
            <ListaPaquetes clienteId={clienteId} negocioId={negocioId} />
        </div>
    )
}
