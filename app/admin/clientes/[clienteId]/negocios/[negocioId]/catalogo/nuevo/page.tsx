import React from 'react'
import CatalogoNuevoForm from '../components/CatalogoNuevoForm';
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Crear Catálogo",
};

interface Props {
    negocioId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return <CatalogoNuevoForm negocioId={negocioId} />
}
