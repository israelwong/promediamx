import React from 'react'
import Paquetes from './components/Paquetes'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Paquetes',
    description: 'Configuración de paquetes',
}


export default function page() {
    return <Paquetes />
}
