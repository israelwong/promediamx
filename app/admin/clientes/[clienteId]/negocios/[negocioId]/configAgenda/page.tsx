import React from 'react'
import { Metadata } from 'next'
import AgendaConfiguracion from './components/AgendaConfguracion';

export const metadata: Metadata = {
    title: 'Agenda',
    description: 'Configurar agenda',
}

interface Props {
    clienteId: string;
    negocioId: string;
}
export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params
    return <AgendaConfiguracion clienteId={clienteId} negocioId={negocioId} />
}
