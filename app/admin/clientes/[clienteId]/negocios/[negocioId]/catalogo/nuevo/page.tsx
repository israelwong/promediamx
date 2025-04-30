import React from 'react'
import CatalogoNuevoForm from '../components/CatalogoNuevoForm';
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Crear Catálogo",
};

interface Props {
    negocioId: string
}

export default function Page({ params }: { params: Props }) {
    const negocioId = params.negocioId;
    return <CatalogoNuevoForm negocioId={negocioId} />
}
