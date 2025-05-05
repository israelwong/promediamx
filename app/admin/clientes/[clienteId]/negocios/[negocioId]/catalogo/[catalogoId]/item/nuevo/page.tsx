import React from 'react'
import ItemNuevoForm from '../components/ItemNuevoForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Crear Nuevo Item",
};

interface Props {
    clienteId: string
    negocioId: string
    catalogoId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, catalogoId, clienteId } = await params
    return <ItemNuevoForm negocioId={negocioId} catalogoId={catalogoId} clienteId={clienteId} />
}