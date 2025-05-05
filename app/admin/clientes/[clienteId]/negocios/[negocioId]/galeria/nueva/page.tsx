import React from 'react'
import { Metadata } from 'next'
import GaleriaNuevaForm from '../components/GaleriaNuevaForm'

export const metadata: Metadata = {
    title: 'Crear Galería',
}

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params;
    return <GaleriaNuevaForm clienteId={clienteId} negocioId={negocioId} />
}
