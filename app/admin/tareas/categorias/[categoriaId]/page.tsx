import React from 'react'
import { Metadata } from 'next'
import CategoriaEditarForm from '../components/CategoriaEditarForm'

export const metadata: Metadata = {
    title: 'detalles de la habilidad'
}

export default async function page({ params }: { params: Promise<{ categoriaId: string }> }) {
    const { categoriaId } = await params
    return <CategoriaEditarForm categoriaId={categoriaId} />
}
