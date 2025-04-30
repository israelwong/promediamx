import React from 'react'
import ListaCategorias from './components/ListaCategorias'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Categorías',
    description: 'Lista de categorías para la IA',
}

export default function page() {
    return <ListaCategorias />
}
