import React from 'react'
import { Metadata } from 'next'
import PaqueteNuevo from './components/PaqueteNuevo'

export const metadata: Metadata = {
    title: 'Nuevo paquete',
    description: 'Crear un nuevo paquete de servicios',
}

export default function page() {
    return <PaqueteNuevo />
}
