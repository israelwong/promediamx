import React from 'react'
import { Metadata } from 'next'
import PaqueteNuevoForm from './components/PaqueteNuevoForm';
export const metadata: Metadata = {
    title: 'Nuevo Paquete',
    description: 'Crear nuevo paquete',
}
interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params;

    return (
        <div>
            <PaqueteNuevoForm clienteId={clienteId} negocioId={negocioId} />
        </div>
    );
}
