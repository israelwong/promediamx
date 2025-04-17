'use client'
import React from 'react'
import { useRouter } from 'next/navigation'

import AsistenteFormEditar from './AsistenteFormEditar'

interface Props {
    asistenteId: string
}

export default function AsistenteDetalle({ asistenteId }: Props) {

    const router = useRouter()

    return (
        <div>
            <div className="flex justify-between items-center w-full p-4">
                <div>
                    <h1>Asistente Virtual</h1>
                </div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <span>Cerrar ventana</span>
                </button>
            </div>

            <div className='grid grid-cols-3 gap-4 p-4'>
                <div className='col-span-2 border border-zinc-700 rounded-lg p-4'>
                    {<AsistenteFormEditar asistenteId={asistenteId} />}
                </div>
                <div className='col-span-1 border border-zinc-700 rounded-lg p-4'>
                    <h1 className="text-2xl font-bold">Habilidades</h1>
                </div>

            </div>
        </div>
    )
}
