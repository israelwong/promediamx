import React from 'react'
import { Metadata } from 'next'
import UsuariosLista from './components/UsuariosLista'

export const metadata: Metadata = {
    title: 'Usuarios',
    description: 'Configuración de usuarios',
}

export default function page() {
    return <UsuariosLista />
}
