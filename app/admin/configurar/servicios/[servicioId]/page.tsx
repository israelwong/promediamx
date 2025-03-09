import React from 'react'
import { Metadata } from 'next'
import ServicioEditar from './componets/ServicioEditar'

export const metadata: Metadata = {
    title: 'Editar servicio',
    description: 'Servicios',
}

export default async function page({ params }: { params: { servicioId: string } }) {
    const { servicioId } = params
    return <ServicioEditar servicioId={servicioId} />
}
