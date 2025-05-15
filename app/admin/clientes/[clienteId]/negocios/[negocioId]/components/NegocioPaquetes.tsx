'use client'
import React from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    clienteId: string
    negocioId: string
}


export default function NegocioPaquetes({ clienteId, negocioId }: Props) {

    const router = useRouter()
    const handleClick = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquete`)
    }
    return (
        <div>
            <h2 className='text-2xl font-bold'>Paquetes</h2>
            <p className='text-sm text-gray-500'>Gestiona los paquetes de servicios para tu negocio.</p>

            <button
                onClick={handleClick}
                className='mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'
            >
                Ver Paquetes
            </button>
        </div>
    )
}
