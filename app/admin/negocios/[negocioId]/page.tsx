import React from 'react'
import { Metadata } from 'next'
import NegocioPanel from './components/NegocioPanel'

export const metadata: Metadata = {
    title: 'Editar usuario',
    description: 'Editar un rol de usuario',
}

export default async function page({ params }: { params: Promise<{ negocioId: string }> }) {
    const { negocioId } = await params
    return <NegocioPanel negocioId={negocioId} />
}
