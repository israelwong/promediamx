import React from 'react'
import ItemNuevoForm from '../components/ItemNuevoForm'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Crear Nuevo Item",
};

interface Props {
    negocioId: string
    catalogoId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, catalogoId } = await params
    // console.log("params", params)
    return <ItemNuevoForm negocioId={negocioId} catalogoId={catalogoId} />
}