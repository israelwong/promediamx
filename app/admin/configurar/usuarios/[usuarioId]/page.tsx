import React from 'react'
import { Metadata } from 'next'
import UsuarioEditar from './components/UsuarioEditar'

export const metadata: Metadata = {
    title: 'Editar usuario',
    description: 'Editar un rol de usuario',
}

export default async function page({ params }: { params: Promise<{ usuarioId: string }> }) {
    const { usuarioId } = await params
    return <UsuarioEditar usuarioId={usuarioId} />
}
