'use client'
import React from 'react'
import HeaderPage from '@/app/admin/_components/HeaderPage'
import UsuarioFormNuevo from './UsuarioFormNuevo'

import { Usuario } from '@/app/admin/_lib/types'
import { crearUsuario } from '@/app/admin/_lib/usuario.actions'
import { useRouter } from 'next/navigation'

export default function Nuevo() {

    const router = useRouter()
    const onGuardar = async (username: string, email: string, telefono: string, rol: string) => {

        const usuario: Usuario = {
            username,
            email,
            telefono,
            password: 'temporal123',
            rol,
            status: 'activo'
        };

        return crearUsuario(usuario)
            .then((result) => {
                if (result.success) {
                    console.log('Usuario creado exitosamente')
                    router.push('/admin/configurar/usuarios')
                }
                return result;
            })
            .catch((error) => {
                console.error('Error creating user:', error)
                throw error;
            });
    }


    return (
        <div>
            <HeaderPage
                titulo='Crear nuevo usuario'
            />

            <UsuarioFormNuevo
                onGuardar={onGuardar}
            />

        </div>
    )
}
