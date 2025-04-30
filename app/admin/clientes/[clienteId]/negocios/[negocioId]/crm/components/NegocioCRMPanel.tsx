import React from 'react'

interface Props {
    negocioId: string;
}

export default function NegocioCRMPanel({ negocioId }: Props) {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">CRM para Negocio {negocioId}</h1>
            <p>Contenido del CRM para el negocio {negocioId}.</p>
        </div>
    )
}
