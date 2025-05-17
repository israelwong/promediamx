import React from 'react'
import { Metadata } from 'next'
import OfertaNuevaForm from './components/OfertaNuevaForm';

export const metadata: Metadata = {
    title: 'Nueva Promoción'
}

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params;
    return <OfertaNuevaForm clienteId={clienteId} negocioId={negocioId} />
}
