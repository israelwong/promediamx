'use client'
import React, { useEffect, useState } from 'react'
import TipoServicioFormEditar from './TipoServicioFormEditar'
import HeaderPage from '@/app/admin/_components/HeaderPage'
import { TipoServicio } from '@/app/admin/_lib/types'
import { obtenerTipoServicio, actualizarTipoServicio, eliminarTipoServicio } from '@/app/admin/_lib/x tipoServicio.actions'


interface Props {
    tipoServicioId: string
}

export default function TipoServicioEditar({ tipoServicioId }: Props) {

    const [tipoServicio, setTipoServicio] = useState<TipoServicio | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        obtenerTipoServicio(tipoServicioId)
            .then(data => {
                setTipoServicio(data)
                setLoading(false)
            })
            .catch(err => {
                console.log(err)
            })
    }, [tipoServicioId])

    const handleActualizarTipoServicio = async (data: TipoServicio) => {
        const response = await actualizarTipoServicio(data)
        return response
    }

    const handleEliminarTipoServicio = async () => {
        const response = await eliminarTipoServicio(tipoServicioId)
        return response
    }

    return (
        <div>
            <HeaderPage titulo='Editar tipo de servicio' />
            {loading ? (
                <p>Cargando...</p>
            ) : (
                <TipoServicioFormEditar
                    tipoServicio={tipoServicio}
                    onActualizar={handleActualizarTipoServicio}
                    onEliminar={handleEliminarTipoServicio}
                />
            )}
        </div>
    )
}
