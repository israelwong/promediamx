import React from 'react'
import UsuariosDashboard from './components/UsuariosDashboard'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Usuarios',
    description: 'Configuración de usuarios',
}

export default function page() {
    return <UsuariosDashboard />
}
