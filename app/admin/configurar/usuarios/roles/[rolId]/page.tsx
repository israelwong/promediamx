import React from 'react'
import RolEditar from './components/RolEditar'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Editar Rol',
    description: 'Editar un rol de usuario',
}

export default async function Page({ params }: { params: Promise<{ rolId: string }> }) {
    const { rolId } = await params;
    return <RolEditar rolId={rolId} />
}