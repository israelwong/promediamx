import React from 'react'
import { Contrato } from '@/app/admin/_lib/types'

interface Props {
    clienteId: string
}

export default function AdministradorDeContratos({ clienteId }: Props) {
    console.log(clienteId)
    return (
        <div>
            Contrato activo y botón hacia abajo para que muestra lista de contratos pasados si existen
        </div>
    )
}
