import React from 'react'
import { Metadata } from 'next'
// import CatalogoEditarForm from '../components/CatalogoEditarForm';
import CatalogoPanel from '../components/CatalogoPanel';

export const metadata: Metadata = {
    title: "Editar Catálogo",
    description: "Editar catálogo para el negocio",
}

export default async function page({ params }: { params: Promise<{ catalogoId: string, negocioId: string }> }) {
    const { catalogoId, negocioId } = await params
    return <CatalogoPanel catalogoId={catalogoId} negocioId={negocioId} />
}
