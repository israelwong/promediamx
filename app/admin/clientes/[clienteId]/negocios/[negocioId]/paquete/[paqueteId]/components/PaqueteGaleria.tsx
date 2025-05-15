import React from 'react'

interface Props {
    negocioId: string
    clienteId: string
    paqueteId: string
}

export default function PaqueteGaleria({ negocioId, clienteId, paqueteId }: Props) {
    // const { data: galeria } = useGetPaqueteGaleriaQuery({ negocioId, clienteId, paqueteId })
    return (
        <div>
            Galeria
        </div>
    )
}
