import React from 'react'
import { Metadata } from 'next'
import LeadLista from './components/LeadLista';

export const metadata: Metadata = {
    title: 'Leads',
}

interface Props {
    clienteId: string
    negocioId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params;
    return <LeadLista negocioId={negocioId} clienteId={clienteId} />
}
