import React from 'react'
import { Metadata } from 'next'
import MarketplaceLista from '../componentes/MarketplaceLista'

export const metadata: Metadata = {
    title: 'Marketplace de tareas',
}

export default async function page({ params }: { params: Promise<{ asistenteId: string }> }) {
    const { asistenteId } = await params
    return (
        <div>
            <MarketplaceLista asistenteId={asistenteId} />
        </div>
    )
}
