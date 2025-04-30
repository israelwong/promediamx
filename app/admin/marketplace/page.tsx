import React from 'react'
import { Metadata } from 'next'
import MarketplaceLista from './componentes/MarketplaceLista'

export const metadata: Metadata = {
    title: 'Marketplace tareas',
}

export default function page() {
    return <MarketplaceLista />
}
