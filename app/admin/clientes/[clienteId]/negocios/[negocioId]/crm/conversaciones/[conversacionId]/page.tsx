import React from 'react'
import { Metadata } from 'next'
import ConversacionDetalle from '../components/ConversacionDetalle'

export const metadata: Metadata = {
    title: 'Conversaciones - CRM',
}

interface Props {
    clienteId: string;
    negocioId: string;
    conversacionId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId, conversacionId } = await params;
    return <ConversacionDetalle clienteId={clienteId} negocioId={negocioId} conversacionId={conversacionId} />
}
