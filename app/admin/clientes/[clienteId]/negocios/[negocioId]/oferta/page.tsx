import React from 'react'
import { Metadata } from 'next'
import OfertasLista from './components/OfertasLista'


export const metadata: Metadata = {
    title: 'Editar Oferta',
    description: 'Editar oferta',
}
interface Props {
    negocioId: string
    clienteId: string
    // ofertaId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params
    return (
        <div>
            <OfertasLista
                negocioId={negocioId}
                clienteId={clienteId}
            />
        </div>
    )
}
