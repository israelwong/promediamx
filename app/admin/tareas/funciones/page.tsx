import React from 'react'
import TareaFunciones from './components/TareaFunciones'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Funciones',
    description: 'Funciones de la aplicación',
}

export default function page() {
    return <TareaFunciones /> // Asegúrate de que la ruta sea correcta
}
