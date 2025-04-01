import React from 'react'
import { Metadata } from 'next'
import ServicioEditar from './components/ServicioEditar'

export const metadata: Metadata = {
    title: 'Editar servicio',
    description: 'Servicios',
}

export default async function page({ params }: { params: Promise<{ servicioId: string }> }) {
    const { servicioId } = await params
    return <ServicioEditar servicioId={servicioId} />
}
