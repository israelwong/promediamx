import React from 'react'
import { Metadata } from 'next'
import AsistentePanel from '../components/AsistentePanel'

export const metadata: Metadata = {
    title: 'Editar usuario',
    description: 'Editar un rol de usuario',
}

export default async function page({ params }: { params: Promise<{ asistenteId: string }> }) {
    const { asistenteId } = await params
    return <AsistentePanel asistenteId={asistenteId} />
}
