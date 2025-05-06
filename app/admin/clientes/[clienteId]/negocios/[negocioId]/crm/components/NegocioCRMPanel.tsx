import React from 'react'

interface Props {
    clienteId: string
    negocioId: string
}

export default function NegocioCRMPanel({ clienteId, negocioId }: Props) {
    console.log(clienteId, negocioId)
    return (
        <div>
            Negocio Panel
        </div>
    )
}
