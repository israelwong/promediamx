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

export default function Page({ params }: { params: Props }) {
    const negocioId = params.negocioId;
    const catalogoId = params.catalogoId;
    console.log("params", params)
    return <ItemNuevoForm negocioId={negocioId} catalogoId={catalogoId} />
}