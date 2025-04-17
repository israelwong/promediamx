import React from 'react'
import { Metadata } from 'next'
import ClienteNuevo from './components/ClienteNuevo'

export const metadata: Metadata = {
    title: 'Nuevo Cliente',
    description: 'Crear nuevo cliente',
}

export default function page() {
    return (
        <div>
            <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
            <ClienteNuevo />
        </div>
    )
}
