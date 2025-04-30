import React from 'react'
import { Metadata } from 'next'
import RolLista from './components/RolLista'

export const metadata: Metadata = {
    title: 'Configurar rol',
    description: 'Configurar rol',
}

export default function page() {
    return <RolLista />
}
