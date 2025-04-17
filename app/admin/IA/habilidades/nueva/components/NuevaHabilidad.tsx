import React from 'react'
import NuevaHabilidadForm from './NuevaHabilidadForm'

export default function NuevaHabilidad() {
    return (
        <div>

            <div className='flex flex-row items-center justify-between mb-5'>
                <h1 className='text-2xl font-bold'>Crear nueva habilidad</h1>
            </div>
            <NuevaHabilidadForm />


        </div>
    )
}
