import React from 'react'
import { Metadata } from 'next'
import CategoriasLista from './components/CategoriasLista'

export const metadata: Metadata = {
    title: 'Categorias',
    description: 'Listado de categorias',
}

interface Props {
    negocioId: string
    clienteId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params
    return <CategoriasLista clienteId={clienteId} negocioId={negocioId} />
}
