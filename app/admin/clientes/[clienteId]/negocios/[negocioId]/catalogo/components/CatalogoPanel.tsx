import React from 'react'
import CatalogoEditarForm from './CatalogoEditarForm'
import CatalogoItems from '../components/CatalogoItems'

interface Props {
    catalogoId: string
    negocioId: string
}

export default function CatalogoPanel({ catalogoId, negocioId }: Props) {
    return (
        <div>
            <div className="grid grid-cols-4 gap-6 max-w-full w-full">
                <div>
                    <CatalogoEditarForm catalogoId={catalogoId} />
                </div>
                <div className="col-span-3">
                    <CatalogoItems catalogoId={catalogoId} negocioId={negocioId} />
                </div>
            </div>
        </div>
    )
}
