import React from 'react'
import { Metadata } from 'next'
import ClientePanel from './components/ClientePanel'

export const metadata: Metadata = {
    title: 'Editar usuario',
    description: 'Editar un rol de usuario',
}

export default async function page({ params }: { params: Promise<{ clienteId: string }> }) {
    const { clienteId } = await params
    return <ClientePanel clienteId={clienteId} />
}
