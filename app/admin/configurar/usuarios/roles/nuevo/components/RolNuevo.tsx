'use client'
import React from 'react'
import { Rol } from '@/app/admin/_lib/types'
import { crearRol } from '@/app/admin/_lib/roles.actions'
import { useRouter } from 'next/navigation'
import RolFormNuevo from './RolFormNuevo'
import HeaderEdith from '@/app/admin/configurar/components/HeaderEdith'

export default function Editar() {

    const router = useRouter()

    function guardar(nombre: string, descripcion: string, status: string) {
        const rol: Rol = {
            nombre: nombre,
            descripcion: descripcion,
            status,
        }

        crearRol(rol)
            .then((rol) => {
                if (rol.success) {
                    console.log('Rol creado:', rol)
                    router.push('/admin/configurar/usuarios/roles')
                }
            })
            .catch((error) => {
                console.error('Error creating role:', error)
            })
    }


    return (
        <div>
            <HeaderEdith titulo='Nuevo rol' />
            <RolFormNuevo
                onGuardar={guardar}
            />
        </div>
    )
}
