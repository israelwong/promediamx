import React from 'react'
import { Metadata } from 'next'
import ListaServicios from './_components/ListaServicios'

export const metadata: Metadata = {
    title: 'Configurar Servicios',
}

function ServiciosPage() {
    return (
        <div className='p-5'>
            <ListaServicios />
        </div>
    )
}

export default ServiciosPage