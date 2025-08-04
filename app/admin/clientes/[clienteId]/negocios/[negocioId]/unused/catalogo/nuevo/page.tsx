// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/nuevo/page.tsx

import React from 'react'
import CatalogoNuevoForm from './components/CatalogoNuevoForm';
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: "Crear Catálogo",
};

interface Props {
    negocioId: string
    clienteId: string; // Asegúrate de que esto coincida con la estructura de tu ruta
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params;
    return <CatalogoNuevoForm negocioId={negocioId} clienteId={clienteId} />
}
