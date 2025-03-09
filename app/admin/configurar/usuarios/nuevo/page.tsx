import React from 'react'
import Nuevo from './component/Nuevo'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Nuevo Usuario',
    description: 'Crear nuevo usuario',
}

export default function page() {
    return <Nuevo />
}
