'use client'
import React from 'react'
import { Servicio } from '../../../../_lib/Types'
import { obtenerServicios } from '../../../../_lib/Servicios'
import { useEffect, useState } from 'react'
import FichaServicio from './FichaServicio'
import Link from 'next/link'


function ListaServicios() {

    const [servicios, setServicios] = useState([] as Servicio[])
    const [loading, setLoading] = useState(true)


    const [searchTerm, setSearchTerm] = useState('')
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value)
    }


    const serviciosFiltrados = servicios.filter(servicio =>
        servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    )

    function fetchServicios() {
        obtenerServicios().then((data) => {
            setServicios(data)
            setLoading(false)
        }
        )
    }

    useEffect(() => {
        fetchServicios()
    }, [])

    if (loading) {
        return <div>Loading...</div>
    }

    function onActualizarServicio() {
        fetchServicios()
    }

    return (
        <div>

            <div className='flex justify-center items-center tracking-tight mb-5'>

                <h1 className='text-2xl flex-grow'>
                    Servicios disponibles
                </h1>

                <div>
                    <input
                        type='text'
                        placeholder='Buscar servicio'
                        className='border rounded-md px-3 py-2 text-sm mr-5 leading-3 text-black'
                        value={searchTerm}
                        onChange={handleInputChange}
                    />

                    <Link className='bg-blue-600 px-3 py-2 rounded-md text-sm leading-2'
                        href='/dashboard/administrar/servicios/crear'
                    >
                        Crear servicio
                    </Link>
                </div>
            </div>


            {servicios.length === 0 ? (
                <div className=''>
                    <p className='text-sm text-zinc-500'>No hay servicios registrados</p>
                </div>
            ) : (
                <div className='grid grid-cols-3 gap-6'>
                    {serviciosFiltrados.map((servicio) => (
                        <div key={servicio.id}>
                            <FichaServicio servicio={servicio} onActualizarServicio={onActualizarServicio} />
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    )
}

export default ListaServicios
