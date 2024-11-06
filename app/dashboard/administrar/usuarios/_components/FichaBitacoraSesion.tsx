import React, { useEffect, useState } from 'react'
import { obtenerSesionesUsuario, cerrarSesionUsuario } from '../../../../_lib/Usuarios'
import { Sesion } from '../../../../_lib/Types'

interface Props {
    id: string
}

function FichaBitacoraSesion({ id }: Props) {

    const [sesiones, setSesiones] = useState<Sesion[]>([])

    useEffect(() => {
        const fetchSesionesUser = async () => {
            const result = await obtenerSesionesUsuario(id)
            setSesiones(result)
        }
        fetchSesionesUser()
    }, [id])

    if (sesiones.length === 0) {
        return <div>No historial de sesiones</div>
    }

    async function handleCerrarSesion() {
        const result = await cerrarSesionUsuario(id)
        if (result.status === 'success') {
            const result = await obtenerSesionesUsuario(id)
            setSesiones(result)
        }
    }


    return (
        <div>
            <div className='flex items-center justify-center'>
                <h1 className='text-2xl pb-5 flex-grow'>Bitacora de sesiones</h1>
                <button onClick={handleCerrarSesion}>
                    Cerrar sesión
                </button>
            </div>

            <div>
                <table className="min-w-full  border border-zinc-500 rounded-md">
                    <thead className="bg-zinc-700">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Fecha inicio
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Fecha de actualización
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                                Estatus
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-500 text-white">
                        {sesiones.map((sesion) => (
                            <tr key={sesion.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(sesion.createdAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(sesion.updatedAt).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {sesion.status}
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    )
}

export default FichaBitacoraSesion
