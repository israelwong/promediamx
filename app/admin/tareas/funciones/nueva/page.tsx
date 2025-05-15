import React from 'react'
import TareaFuncionFormulario from './components/TareaFuncionFormulario'

import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Nueva Función',
    description: 'Crear una nueva función para la tarea',
}

export default function page() {
    return <TareaFuncionFormulario />
}
