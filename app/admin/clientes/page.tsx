import React from 'react'
import DashboardClientes from './componentes/DashboardClientes'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurar',
    description: 'Configuración de la aplicación',
}

export default function page() {
    return <DashboardClientes />
}
