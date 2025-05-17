import React from 'react'

interface Props {
    clienteId: string;
    negocioId: string;
}

export default function AsistenteConfig({ clienteId, negocioId }: Props) {
    return (
        <div>
            Configurar asistente
        </div>
    )
}
