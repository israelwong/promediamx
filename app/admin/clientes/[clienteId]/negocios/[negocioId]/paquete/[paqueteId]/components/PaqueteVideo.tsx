import React from 'react'

interface Props {
    negocioId: string
    clienteId: string
    paqueteId: string
}

export default function PaqueteVideo({ negocioId, clienteId, paqueteId }: Props) {
    // const { data: video } = useGetPaqueteVideoQuery({ negocioId, clienteId, paqueteId })
    return (
        <div>
            Videos
        </div>
    )
}
