import React from 'react'
import { Metadata } from 'next'
import AsistenteNuevoForm from '../components/AsistenteNuevoForm'

export const metadata: Metadata = {
    title: 'Crear nuevo asistente',
    description: 'Crear nuevo asistente virtual',
}

export default function page() {
    return <AsistenteNuevoForm />
}
