import React from 'react'
import TipoServicio from './components/TipoServicio'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Servicios',
    description: 'Editar un rol de usuario',
}

export default function page() {
    return <TipoServicio />
}
