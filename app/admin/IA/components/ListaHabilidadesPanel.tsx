'use client'
import React, { useState, useEffect } from 'react'
import { obtenerHabilidades } from '@/app/admin/_lib/habilidades.actions'
import { useRouter } from 'next/navigation'

import { Habilidad } from '@/app/admin/_lib/types'

export default function ListaHabilidadesPanel() {

    const router = useRouter()
    const [habilidades, setHabilidades] = useState<Habilidad[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchHabilidades = async () => {
            try {
                const data = await obtenerHabilidades()
                setHabilidades(data)
            } catch (error) {
                setError(`Error al cargar las habilidades ${error}}`)
            } finally {
                setLoading(false)
            }
        }

        fetchHabilidades()
    }, [])
    if (loading) {
        return (
            <div>
                Cargando habilidades...
            </div>
        )
    }
    if (error) {
        return (
            <div>
                {error}
            </div>
        )
    }


    return (
        <div className='border border-zinc-700 rounded-lg p-4 bg-zinc-900'>
            <div className='flex flex-row items-center justify-between mb-5'>
                <h1 className='text-2xl font-bold'>Lista de habilidades</h1>
                <button className='bg-blue-500 text-white px-4 py-2 rounded' onClick={() => router.push('/admin/IA/habilidades/nueva')}>
                    Crear nueva habilidad
                </button>
            </div>

            {habilidades.length === 0 ? (
                <div className='italic text-zinc-500 h-20 items-center flex justify-start'>
                    No hay habilidades definidas
                </div>
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {habilidades.map((habilidad) => (
                        <button
                            onClick={() => router.push(`/admin/IA/habilidades/${habilidad.id}`)}
                            key={habilidad.id}
                            className='bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-left'
                        >
                            <div className='font-medium'>{habilidad.nombre}</div>
                            <div className='text-sm text-zinc-400'>{habilidad.descripcion}</div>
                        </button>
                    ))}
                </div>
            )}

        </div>
    )
}
