import React from 'react'

interface Props {
    clienteId: string
    negocioId: string
}

export default function NegocioCRMPanel({ clienteId, negocioId }: Props) {
    console.log(clienteId, negocioId)
    return (
        <div className='grid grid-cols-4 gap-4 h-full'>
            <div className='bg-zinc-700 p-5'>
                lisado de conversaciones
            </div>
            <div className='col-span-3 flex' >
                <div className='bg-zinc-700 p-5'>
                    Conversación
                </div>
                <div>
                    Herramietnas
                </div>
            </div>
        </div>
    )
}
