import React from 'react'
import TipoServicioNuevo from './components/TipoServicioNuevo'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Nuevo tipo de servicio',
    description: 'Configuración de la aplicación',
}

export default function page() {
    return <TipoServicioNuevo />
}
