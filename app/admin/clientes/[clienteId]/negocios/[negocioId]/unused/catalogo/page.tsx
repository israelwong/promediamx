// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/page.tsx
import React from 'react'
import { Metadata } from 'next'
import CatalogoLista from './components/CatalogoLista'

export const metadata: Metadata = {
    title: 'Catalogo',
    description: 'Catalogo de productos y servicios',
}

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { clienteId, negocioId } = await params
    return <CatalogoLista clienteId={clienteId} negocioId={negocioId} />
}
