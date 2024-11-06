import React from 'react'
import FormUsuario from '../_components/FormUsuario'

function page() {
    return (
        <div className='p-5'>

            <div className='flex flex-grow justify-between gap-5'>

                <div className='w-1/3 border-r border-r-zinc-600 border-dotted pr-5'>
                    <h1 className='text-xl pb-5 py-5'>
                        Nuevo usuario
                    </h1>

                    <FormUsuario />

                </div>

                <div className='flex-1 px-5'>
                    <h1 className='text-xl pb-5 py-5'>
                        Sobre la creación de usuarios
                    </h1>

                    Comentarios
                </div>

            </div>
        </div>

    )
}

export default page
