import React from 'react'
import { Metadata } from 'next'
import NuevaHabilidad from './components/NuevaHabilidad'

export const metadata: Metadata = {
    title: 'Nueva habilidad',
    description: 'Crear nueva habilidad',
}

export default function page() {
    return <NuevaHabilidad />
}
