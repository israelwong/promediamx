import React from 'react'
import { Metadata } from 'next'
import RolNuevo from './components/RolNuevo';

export const metadata: Metadata = {
    title: 'Nuevo Rol',
    description: 'Editar un rol de usuario',
}

export default function Page() {
    return <RolNuevo />
}