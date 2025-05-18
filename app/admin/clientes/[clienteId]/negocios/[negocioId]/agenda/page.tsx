import React from 'react'
import { Metadata } from 'next'
import AgendaConfguraxion from './AgendaConfguracion';

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
    return <AgendaConfguraxion clienteId={clienteId} negocioId={negocioId} />
}
