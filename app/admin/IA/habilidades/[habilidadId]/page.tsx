import React from 'react'
import { Metadata } from 'next'
import HabilidadPanel from './components/HabilidadPanel'

export const metadata: Metadata = {
    title: 'detalhes de la habilidad'
}

export default async function page({ params }: { params: Promise<{ habilidadId: string }> }) {
    const { habilidadId } = await params
    return <HabilidadPanel habilidadId={habilidadId} />
}
