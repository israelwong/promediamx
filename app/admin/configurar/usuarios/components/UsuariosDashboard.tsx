'use client'
// import React, { useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { Plus } from 'lucide-react'

// import { Usuario } from '@/app/lib/types'
// import { obtenerUsuarios } from '@/app/admin/_lib/usuario.actions'


export default function UsuariosDashboard() {

    // const router = useRouter()
    // const [usuarios, setUsuarios] = React.useState<Usuario[]>([])
    // const [loading, setLoading] = React.useState<boolean>(true)

    // useEffect(() => {
    //     obtenerUsuarios()
    //         .then((usuarios) => {
    //             if (usuarios) {
    //                 setUsuarios(usuarios)
    //                 setLoading(false)
    //             }
    //         })
    //         .catch((error) => {
    //             console.error('Error fetching users:', error)
    //         })
    // }, [])

    return (
        <div>
            {/* encabezado */}
            {/* <div className='flex justify-between items-center text-white'>
                <div className='text-2xl'>
                    Configuración de Usuarios
                </div>
                <div className='space-x-2 flex items-center'>
                    <button className='bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1'
                        onClick={() => router.push('/admin/configurar/usuarios/usuarios')}>
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
                        onClick={() => router.push('/admin/configurar/usuarios')}>
                        Cerrar ventana
                    </button>
                </div>
            </div> */}



        </div>
    )
}
