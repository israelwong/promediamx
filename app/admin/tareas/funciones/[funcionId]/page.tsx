import React from 'react'
import TareaFuncionEditarFormulario from './components/TareaFuncionEditarFormulario'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Editar Función',
    description: 'Funciones de la aplicación',
}

interface Props {
    funcionId: string
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { funcionId } = await params
    return <TareaFuncionEditarFormulario funcionId={funcionId} />
}
