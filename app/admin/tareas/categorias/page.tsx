import React from 'react'
import TareasCategorias from './components/TareasCategorias'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Categorías',
    description: 'Lista de categorías para la IA',
}

export default function page() {
    return <TareasCategorias />
}
