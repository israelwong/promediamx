import React from 'react'
import { Metadata } from 'next'
import ParametroNuevoForm from '../components/ParametroNuevoForm'

export const metadata: Metadata = {
    title: 'Nuevo Parámetro Requerido',
    description: 'Crear un nuevo parámetro requerido para la tarea.'
}

export default function page() {
    return <ParametroNuevoForm />
}
