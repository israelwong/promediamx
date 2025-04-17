'use client'
import React from 'react'
import HabilidadFormEditar from './HabilidadEditarForm'
import InstruccionLista from './InstruccionLista'
import { useRouter } from 'next/navigation'

interface Props {
    habilidadId: string
}

export default function HabilidadPanel({ habilidadId }: Props) {


    const router = useRouter()
    return (
        <div>

            <div className='flex flex-row items-center justify-between mb-5'>
                <h1 className='text-2xl font-bold'>Detalles de la habilidad</h1>
                <button className='bg-blue-500 text-white px-4 py-2 rounded mt-4' onClick={() => router.push('/admin/IA')}>
                    Cerrar ventana
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4">

                <div className='col-span-2'>
                    <HabilidadFormEditar habilidadId={habilidadId} />
                </div>

                <div className='col-span-1 border border-zinc-700 rounded-lg p-4 bg-zinc-900'>
                    <div className='flex flex-row items-center justify-between'>
                        <h1 className='text-2xl font-bold'>Instrucciones</h1>
                        <button className='border border-zinc-500 text-zinc-300 px-4 py-2 rounded flex items-center gap-2' onClick={() => router.push(`/admin/IA/habilidades/instruccion/nueva/?habilidadId=${habilidadId}`)}>
                            <span> Nueva Instrucción </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <div className='mt-4'>
                        <InstruccionLista habilidadId={habilidadId} />
                    </div>
                </div>

            </div>
        </div>
    )
}
