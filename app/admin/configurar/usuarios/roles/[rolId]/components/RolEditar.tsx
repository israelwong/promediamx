'use client'
import React, { useEffect } from 'react'
import { Rol } from '@/app/admin/_lib/types'
import { obtenerRol, actualizarRol, eliminarRol } from '@/app/admin/_lib/roles.actions'
import { useRouter } from 'next/navigation'

import RolFormEditar from './RolFormEditar'
import HeaderEdith from '@/app/admin/configurar/components/HeaderEdith'
import LoadingPage from '@/app/admin/configurar/components/LoadingPage'

interface Props {
    rolId: string;
}

export default function Editar({ rolId }: Props) {

    const router = useRouter()
    const [rol, setRol] = React.useState<Rol | null>(null)

    useEffect(() => {
        obtenerRol(rolId)
            .then((rol) => {
                if (rol) {
                    setRol(rol)
                }
            })
            .catch((error) => {
                console.error('Error fetching role:', error)
            })
    }
        , [rolId])

    function guardar(nombre: string, descripcion: string, status: string) {
        const rol: Rol = {
            id: rolId,
            nombre: nombre,
            descripcion: descripcion,
            status,
        }

        actualizarRol(rolId, rol)
            .then((rol) => {
                if (rol.success) {
                    console.log('Rol actualizado:', rol)
                    router.push('/admin/configurar/usuarios/roles')
                }
            })
            .catch((error) => {
                console.error('Error updating role:', error)
            })
    }

    function eliminar() {

        eliminarRol(rolId)
            .then((rol) => {
                if (rol.success) {
                    console.log('Rol eliminado:', rol)
                    router.push('/admin/configurar/usuarios/roles')
                }
            })
            .catch((error) => {
                console.error('Error deleting role:', error)
            })
    }


    return (
        <div>
            <HeaderEdith titulo='Editar rol' />
            {rol ? (
                <RolFormEditar
                    initialNombre={rol.nombre ?? undefined}
                    initialDescripcion={rol.descripcion ?? ''}
                    initialStatus={rol.status ?? 'activo'}
                    onGuardar={guardar}
                    onEliminar={eliminar}
                />
            ) : (
                <LoadingPage mensaje='Cargando datos...' />
            )}
        </div>
    )
}
