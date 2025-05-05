import React from 'react'
import NegocioCRMPanel from './components/NegocioCRMPanel'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CRM',
    description: 'Gestión de CRM',
}

interface Props {
    clienteId: string
    negocioId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params
    return <NegocioCRMPanel clienteId={clienteId} negocioId={negocioId} />

}