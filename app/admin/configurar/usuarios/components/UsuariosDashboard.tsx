'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Usuario } from '@/app/admin/_lib/types'
import { obtenerUsuarios } from '@/app/admin/_lib/usuario.actions'
import LoadingPage from '../../../_components/LoadingPage'


export default function UsuariosDashboard() {

    const router = useRouter()
    const [usuarios, setUsuarios] = React.useState<Usuario[]>([])
    const [loading, setLoading] = React.useState<boolean>(true)

    useEffect(() => {
        obtenerUsuarios()
            .then((usuarios) => {
                if (usuarios) {
                    setUsuarios(usuarios)
                    setLoading(false)
                }
            })
            .catch((error) => {
                console.error('Error fetching users:', error)
            })
    }, [])

    return (
        <div>
            {/* encabezado */}
            <div className='flex justify-between items-center text-white mb-5'>
                <div className='text-2xl'>
                    Configuración de Usuarios
                </div>
                <div className='space-x-2 flex items-center'>
                    <button className='bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1'
                        onClick={() => router.push('/admin/configurar/usuarios/nuevo')}>
                        <Plus size={16} />
                        <span>
                            Crear nuevo usuario
                        </span>
                    </button>
                    <button className='bg-blue-800 border border-blue-800 rounded px-3 py-1 text-zinc-200'
                        onClick={() => router.push('/admin/configurar/usuarios/roles')}>
                        Administrar roles
                    </button>
                    <button className='bg-red-700 border border-red-600 rounded px-3 py-1'
                        onClick={() => router.push('/admin/configurar')}>
                        Cerrar ventana
                    </button>
                </div>
            </div>

            {/* tabla */}
            {loading ? (
                <LoadingPage
                    mensaje="Cargando usuarios..."
                />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-zinc-900 border border-zinc-800 text-zinc-200 font-FunnelSans">
                        <thead>
                            <tr>
                                <th className="text-left px-4 py-2">ID</th>
                                <th className="text-left px-4 py-2">Nombre</th>
                                <th className="text-left px-4 py-2">Correo</th>
                                <th className="text-left px-4 py-2">Rol</th>
                                <th className="text-left px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((usuario) => (
                                <tr key={usuario.id} className="hover:bg-zinc-800 cursor-pointer"
                                    onClick={() => router.push(`/admin/configurar/usuarios/${usuario.id}`)}>
                                    <td className="px-4 py-2">{usuario.id}</td>
                                    <td className="px-4 py-2">{usuario.username}</td>
                                    <td className="px-4 py-2">{usuario.email}</td>
                                    <td className="px-4 py-2">{usuario.rol}</td>
                                    <td className="px-4 py-2">{usuario.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
