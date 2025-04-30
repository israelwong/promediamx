'use client'
import { useEffect, useState } from 'react'
import { obtenerServicio, actualizarServicio, eliminarServicio } from '@/app/admin/_lib/x servicios.actions'
import { TipoServicio } from '@/app/admin/_lib/types'
import { obtenerTiposServicios } from '@/app/admin/_lib/x tipoServicio.actions'
import { Servicio } from '@/app/admin/_lib/types'

import HeaderPage from '@/app/admin/_components/HeaderPage'
import LoadingPage from '@/app/admin/_components/LoadingPage'

import ServicioEditarForm from './ServicioEditarForm'

interface Props {
    servicioId: string;
}

export default function ServicioEditar({ servicioId }: Props) {

    const [servicio, setServicio] = useState<Servicio | null>(null)
    const [tiposServicios, setTiposServicios] = useState<TipoServicio[]>([])

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        obtenerServicio(servicioId)
            .then((res) => {
                setServicio(res)
                setLoading(false)
            })

        obtenerTiposServicios()
            .then((res) => {
                setTiposServicios(res)
            })
    }, [servicioId])

    const handleGuardar = async (servicio: Servicio) => {
        const result = await actualizarServicio(servicio)
        return result
    }

    const handleEliminar = async () => {
        const result = await eliminarServicio(servicioId)
        return result
    }


    return (
        <div>
            {loading ? (
                <LoadingPage mensaje='Cargando servicio...' />
            ) : (
                <div>
                    <HeaderPage
                        titulo='Editar Servicio'
                    />
                    <ServicioEditarForm
                        servicio={servicio!}
                        tiposServicios={tiposServicios}
                        onGuardar={handleGuardar}
                        onEliminar={handleEliminar}
                    />
                </div>
            )}
        </div>

    )
}
