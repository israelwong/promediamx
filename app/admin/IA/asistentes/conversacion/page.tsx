import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configuración de Conversación',
    description: 'Configuración de la conversación para la IA',
}

import ConfiguracionConversacion from './components/ConfiguracionConversacion'


export default function page() {
    return <ConfiguracionConversacion />
}
