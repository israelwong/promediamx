'use client'
import React, { useEffect, useState } from 'react'

import { TipoServicio } from '@/app/admin/_lib/types'
import { obtenerTiposServicios } from '@/app/admin/_lib/tipoServicio.actions'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import LoadingPage from '@/app/admin/_components/LoadingPage'

export default function TipoServicioMain() {

    const router = useRouter()
    const [tiposServicios, setTiposServicios] = useState<TipoServicio[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        obtenerTiposServicios()
            .then(data => {
                setTiposServicios(data)
                setLoading(false)
            })
            .catch(err => {
                console.log(err)
            })
    }, [])


    return (
        <div>

            {/* encabezado */}
            <div className='flex justify-between items-center text-white mb-5'>
                <div className='text-2xl'>
                    Tipos de servicio
                </div>
                <div className='space-x-2 flex items-center'>
                    <button className='bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1'
                        onClick={() => router.push('/admin/configurar/servicios/tipoServicio/nuevo')}>
                        <Plus size={16} />
                        <span>
                            Crear nuevo tipo de servicio
                        </span>
                    </button>
                    <button className='bg-red-700 border border-red-600 rounded px-3 py-1'
                        onClick={() => router.push('/admin/configurar/servicios')}>
                        Cerrar ventana
                    </button>
                </div>
            </div>

            <div className='max-w-screen-md mx-auto'>
                {loading ? (
                    <LoadingPage mensaje='Cargando tipo de servicios' />
                ) : (
                    <div>
                        {tiposServicios.length === 0 ? (
                            <div className='text-white'>
                                No hay tipos de servicios registrados
                            </div>
                        ) : (
                            <div className='text-white'>
                                {tiposServicios.map(tipoServicio => (
                                    <div key={tipoServicio.id} className='flex justify-between items-center bg-zinc-900 border border-zinc-600 p-5 mb-2 rounded-md cursor-pointer hover:bg-zinc-800'
                                        onClick={() => router.push(`/admin/configurar/servicios/tipoServicio/${tipoServicio.id}`)}>
                                        <div>
                                            {tipoServicio.nombre}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>



        </div>
    )
}
