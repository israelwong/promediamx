'use client';
import React, { useEffect, useState } from 'react'
import { Servicio } from '@/app/admin/_lib/types'
import { crearServicio } from '@/app/admin/_lib/servicios.actions';
import ServicioNuevoForm from './ServicioNuevoForm';
import { TipoServicio } from '@/app/admin/_lib/types';
import { obtenerTiposServicios } from '@/app/admin/_lib/tipoServicio.actions';
import HeaderPage from '@/app/admin/_components/HeaderPage';

export default function ServicioNuevo() {

    const [tiposServicios, setTiposServicios] = useState<TipoServicio[]>([])

    useEffect(() => {
        obtenerTiposServicios().then((data) => {
            setTiposServicios(data)
        })
    }, [])

    const crearNuevoServicio = async (data: Servicio) => {
        const response = await crearServicio(data)
        return response
    }

    return (
        <div>
            <HeaderPage titulo="Nuevo servicio" />
            <ServicioNuevoForm onGuardar={crearNuevoServicio} tiposServicios={tiposServicios} />
        </div>
    )
}
