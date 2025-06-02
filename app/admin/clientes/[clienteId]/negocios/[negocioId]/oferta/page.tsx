//ruta del archivo: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/page.tsx
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
        <div className="flex flex-col gap-4 h-full">
            <OfertasLista
                negocioId={negocioId}
                clienteId={clienteId}
            />
        </div>
    )
}
