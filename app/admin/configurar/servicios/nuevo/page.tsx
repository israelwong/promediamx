import React from 'react'
import { Metadata } from 'next'
import ServicioNuevo from './componets/ServicioNuevo'

export const metadata: Metadata = {
    title: 'Nuevo servicio',
}

export default function page() {
    return <ServicioNuevo />
}
