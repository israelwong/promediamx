import React from 'react'
// import { AsistenteVirtual } from '@/app/admin/_lib/types'

interface Props {
    clienteId: string
}

export default function AdministradorDeAsistentes({ clienteId }: Props) {
    console.log(clienteId)
    return (
        <div>
            Listar todos los asistentes virtuales
        </div>
    )
}
