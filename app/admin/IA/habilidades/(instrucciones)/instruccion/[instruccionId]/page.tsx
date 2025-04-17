import React from 'react'
import { Metadata } from 'next'
import InstruccionEditarForm from '../components/InstruccionEditarForm'

export const metadata: Metadata = {
    title: 'detalhes de la habilidad'
}

export default async function page({ params }: { params: Promise<{ instruccionId: string }> }) {
    const { instruccionId } = await params
    return <InstruccionEditarForm instruccionId={instruccionId} />
}
