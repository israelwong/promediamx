import React from 'react'
import NegocioCRMPanel from './components/NegocioCRMPanel'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'CRM',
    description: 'Gestión de CRM',
}

export default function page({ params }: { params: { negocioId: string } }) {
    return (
        <div>
            <NegocioCRMPanel negocioId={params.negocioId} />
        </div>
    )
}
