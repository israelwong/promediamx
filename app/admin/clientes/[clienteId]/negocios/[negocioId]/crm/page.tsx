import React from 'react'
import NegocioCRMPanel from './components/NegocioCRMPanel'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CRM',
    description: 'Gestión de CRM',
}

export default async function page({ params }: { params: Promise<{ negocioId: string }> }) {
    const { negocioId } = await params
    return (
        <div>
            <NegocioCRMPanel negocioId={negocioId} />
        </div>
    )
}
