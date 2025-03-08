'use client'
import React, { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { obtenerRoles } from '@/app/admin/_lib/roles.actions'
import { Rol } from '@/app/admin/_lib/types'
import LoadingPage from '../../../components/LoadingPage'

export default function Roles() {

    const router = useRouter()
    const [roles, setRoles] = React.useState<Rol[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)

    useEffect(() => {
        obtenerRoles()
            .then((roles: Rol[]) => {
                if (roles.length === 0) {
                    console.log('No hay roles disponibles');
                } else {
                    setRoles(roles)
                }
                setLoading(false)
            })
            .catch((error) => {
                console.error('Error fetching roles:', error)
            })
    }, [])

    if (loading) {
        return <LoadingPage mensaje='Cargando roles...' />
    }

    return (
        <div className=''>

            <div className='flex justify-between items-center text-white mb-5'>
                <div className='text-2xl'>
                    Administración de roles de usuarios
                </div>
                <div className='space-x-2 flex items-center'>
                    <button className='bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1'
                        onClick={() => router.push('/admin/configurar/usuarios/roles/nuevo')}>
                        <Plus size={16} />
                        <span>
                            Crear nuevo rol
                        </span>
                    </button>

                    <button className='bg-red-700 border border-red-600 rounded px-3 py-1'
                        onClick={() => router.push('/admin/configurar/usuarios')}>
                        Cerrar ventana
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-zinc-900 border border-zinc-800 text-zinc-200 font-FunnelSans">
                    <thead>
                        <tr className="text-left">
                            <th className="py-3 px-4 font-semibold">ID</th>
                            <th className="py-3 px-4 font-semibold">Nombre</th>
                            <th className="py-3 px-4 font-semibold">Descripción</th>
                            <th className="py-3 px-4 font-semibold">Estado</th>
                            <th className="py-3 px-4 font-semibold">Creado</th>
                            <th className="py-3 px-4 font-semibold">Actualizado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((rol) => (
                            <tr key={rol.id} className="border-b border-zinc-800 cursor-pointer hover:bg-zinc-800"
                                onClick={() => router.push(`/admin/configurar/usuarios/roles/${rol.id}`)}
                            >
                                <td className="py-3 px-4">{rol.id}</td>
                                <td className="py-3 px-4">{rol.nombre}</td>
                                <td className="py-3 px-4">{rol.descripcion}</td>
                                <td className="py-3 px-4">{rol.status}</td>
                                <td className="py-3 px-4">{rol.createdAt ? new Date(rol.createdAt).toLocaleDateString() : 'N/A'}</td>
                                <td className="py-3 px-4">{rol.updatedAt ? new Date(rol.updatedAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


        </div>
    )
}
