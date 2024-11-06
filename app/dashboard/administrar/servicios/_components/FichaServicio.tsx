import { Servicio } from '../../../../_lib/Types'
import { actualizarServicio } from '../../../../_lib/Servicios';
import React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react';

interface FichaServicioProps {
    servicio: Servicio;
    onActualizarServicio: () => void;
}


const FichaServicio: React.FC<FichaServicioProps> = ({ servicio, onActualizarServicio }) => {

    const router = useRouter()

    async function handleActualizar() {
        const nuevoStatus = servicio.status === 'activo' ? 'inactivo' : 'activo'
        const servicioActualizado = { ...servicio, status: nuevoStatus }
        const updated = await actualizarServicio(servicioActualizado)
        if (updated.success) {
            console.log('Servicio actualizado')
            onActualizarServicio()
        }
    }

    return (
        <div className='bg-zinc-900/20 border border-zinc-800 p-5 rounded-md max-h-56'>

            <div className='flex items-center justify-center mb-4'>
                <h2 className='flex-grow text-lg font-semibold uppercase'>
                    <button
                        onClick={() => router.push(`/dashboard/administrar/servicios/editar/${servicio.id}`)}
                        className='flex items-center' aria-label='Editar usuario'>
                        <Pencil size={12} className='mr-2' />
                        <span>{servicio.nombre}</span>
                    </button>
                </h2>
                <div className='flex justify-center items-center gap-3'>

                    <button onClick={handleActualizar} className='text-red-600'>
                        {servicio.status === 'activo' ? (
                            <span className='text-green-600 border border-green-600 px-2 py-1 rounded-md leading-3 text-sm'>
                                Activo
                            </span>
                        ) : (
                            <span className='text-red-600 border border-red-600 px-2 py-1 rounded-md leading-3 text-sm'>
                                Inactivo
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className='text-sm mb-3 font-extralight h-28 max-h-24 overflow-y-auto'>
                <span className='text-zinc-400 mr-2'>Descripción:</span>
                {servicio.descripcion}
            </div>

            <div className='grid grid-cols-3 mb-5 border-t '>
                <div>
                    <span className='text-zinc-400 text-sm'>Precio</span>
                    <p className='text-sm'>
                        {servicio.precio ? servicio.precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A'}
                    </p>
                </div>

                <div>
                    <span className='text-zinc-400 text-sm'>Cuota mensual</span>
                    <p className='text-sm'>
                        {servicio.cuota_mensual ? servicio.cuota_mensual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A'}
                    </p>
                </div>

                <div>
                    <span className='text-zinc-400 text-sm'>Cuota anual</span>
                    <p className='text-sm'>
                        {servicio.cuota_anual ? servicio.cuota_anual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A'}
                    </p>
                </div>
            </div>

        </div>
    )
}

export default FichaServicio
