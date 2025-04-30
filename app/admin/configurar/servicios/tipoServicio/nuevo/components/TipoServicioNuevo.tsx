'use client'
import React from 'react'
import { TipoServicio } from '@/app/admin/_lib/types'
import { crearTipoServicio } from '@/app/admin/_lib/x tipoServicio.actions'
import TipoServicioFormNuevo from './TipoServicioFormNuevo'
import HeaderPage from '@/app/admin/_components/HeaderPage'

export default function TipoServicioNuevo() {

    const handleCrearTipoServicio = async (data: TipoServicio) => {
        const response = await crearTipoServicio(data)
        return response
    }

    return (
        <div>
            <HeaderPage titulo='Nuevo tipo de servicio' />
            <TipoServicioFormNuevo
                onGuardar={handleCrearTipoServicio}
            />
        </div>
    )

}
