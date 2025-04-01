import React from 'react'
import { Servicio } from '@/app/admin/_lib/types'

interface Props {
    servicios: Servicio[];
}

export default function ListaServicios({ servicios }: Props) {
    return (
        <div>
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {servicios.map((servicio) => (
                        <tr key={servicio.id}>
                            <td>{servicio.nombre}</td>
                            <td>{servicio.descripcion}</td>
                            <td>{servicio.precio}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
