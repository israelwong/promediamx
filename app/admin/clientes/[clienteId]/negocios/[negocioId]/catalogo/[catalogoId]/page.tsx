import React from 'react'
import { Metadata } from 'next'
import CatalogoEditarForm from '../components/CatalogoEditarForm'
import CatalogoItems from '../components/CatalogoItems'

export const metadata: Metadata = {
    title: "Editar Catálogo",
    description: "Editar catálogo para el negocio",
}

interface Props {
    clienteId: string;
    negocioId: string;
    catalogoId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { catalogoId, negocioId, clienteId } = await params
    return (
        <div>
            <div className="grid grid-cols-4 gap-6 max-w-full w-full">
                <div>
                    <CatalogoEditarForm catalogoId={catalogoId} clienteId={clienteId} negocioId={negocioId} />
                </div>
                <div className="col-span-3">
                    <CatalogoItems catalogoId={catalogoId} clienteId={clienteId} negocioId={negocioId} />
                </div>
            </div>
        </div>
    )
}
