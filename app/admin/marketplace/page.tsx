// app/admin/marketplace/page.tsx
import React from 'react'
import { Metadata } from 'next'
import MarketplaceLista from './componentes/MarketplaceLista'

export const metadata: Metadata = {
    title: 'Marketplace tareas',
}

export default function page() {
    return (
        <div className="flex flex-col p-5">
            <MarketplaceLista />
        </div>
    )
}
