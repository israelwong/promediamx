import React from 'react'
import Servicios from './components/Servicios'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Servicios',
    description: 'Configuración de la aplicación',
}

export default function page() {
    return <Servicios />
}
