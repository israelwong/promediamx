import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CRM Agenda',
}

import CRMAgenda from './components/CRMAgenda'
import AgendaLista from './components/AgendaLista'


interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params
    return (
        <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1">
                <AgendaLista negocioId={negocioId} />
            </div>
            <div className="col-span-3">
                <CRMAgenda negocioId={negocioId} />
            </div>
        </div>
    )
}
