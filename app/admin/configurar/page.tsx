import React from 'react'
import Configurar from './components/Configurar'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurar',
    description: 'Configuración de la aplicación',
}

export default function page() {
    return <Configurar />
}
