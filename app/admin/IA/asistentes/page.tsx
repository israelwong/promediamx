import React from 'react'
import { Metadata } from 'next'
import ListaAsistentes from './components/ListaAsistentes'

export const metadata: Metadata = {
    title: 'Asistentes',
    description: 'Lista de asistentes para la IA',
}

export default function page() {
    return <ListaAsistentes />
}
