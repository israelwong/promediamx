'use client';
import React, { useEffect } from 'react'
import HeaderPage from '@/app/admin/_components/HeaderPage'
import LoadingPage from '@/app/admin/_components/LoadingPage';
import UsuarioFormEditar from './UsuarioFormEditar'

import { Usuario } from '@/app/admin/_lib/types'
import { obtenerUsuario, actualizarUsuario, eliminarUsuario } from '@/app/admin/_lib/usuario.actions'

interface Proops {
    usuarioId: string
}

export default function UsuarioEditar({ usuarioId }: Proops) {

    // const router = useRouter()
    const [usuario, setUsuario] = React.useState<Usuario | null>(null)
    const [loading, setLoading] = React.useState<boolean>(true)

    useEffect(() => {
        obtenerUsuario(usuarioId)
            .then((usuario) => {
                if (usuario) {
                    setUsuario(usuario)
                    setLoading(false)
                }
            })
            .catch((error) => {
                console.error('Error fetching user:', error)
            })
        setLoading(false)
    }, [usuarioId])

    const onGuardar = async (usuarioActualizado: Usuario): Promise<{ success: boolean; error?: string }> => {
        const result = await actualizarUsuario(usuarioActualizado)
        return result
    }

    const onEliminar = async (): Promise<{ success: boolean; error?: string }> => {
        const result = await eliminarUsuario(usuarioId)
        return result
    }

    return (
        <div>
            <HeaderPage
                titulo='Editar usuario'
            />
            {loading ? (
                <LoadingPage
                    mensaje="Cargando usuario..."
                />
            ) : (
                usuario && (
                    <UsuarioFormEditar
                        usuario={usuario}
                        onGuardar={onGuardar}
                        onEliminar={onEliminar}
                    />
                )
            )}
        </div>
    )
}
