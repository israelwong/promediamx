import React from 'react'
import { Metadata } from 'next'
import LeadFormNuevo from '../components/LeadFormNuevo'

export const metadata: Metadata = {
    title: 'Nuevo Lead',
}

interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params;
    return <LeadFormNuevo negocioId={negocioId} clienteId={clienteId} />
}
