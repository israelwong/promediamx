import React from 'react'
import ClientesLista from './componentes/ClientesLista'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurar',
    description: 'Configuración de la aplicación',
}

export default function page() {
    return <ClientesLista />
}
