import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CRM Agenda',
}

import CRMAgenda from './components/CRMAgenda'

interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params
    return <CRMAgenda negocioId={negocioId} />
}
