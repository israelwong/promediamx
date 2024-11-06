'use client'
import { useParams } from 'next/navigation'
import React from 'react'
import { obtenerUsuario } from '../../../../_lib/Usuarios'
import { Usuario } from '../../../../_lib/Types'
import FormEditUsuario from '../_components/FormEditUsuario'
import FichaBitacoraSesion from '../_components/FichaBitacoraSesion'


interface Params {
    [key: string]: string
}

function EditarUsuario() {

    const params = useParams<Params>()
    const { id } = params
    const [usuario, setUsuario] = React.useState({} as Usuario)

    React.useEffect(() => {
        async function fetchUsuario() {
            const usuario = await obtenerUsuario(id)
            if (usuario) setUsuario(usuario)
        }
        fetchUsuario()
    }, [id])

    return (
        <div className='p-5'>
            <div className='flex gap-5'>
                <div className='w-1/3 border-r pr-5 '>
                    <FormEditUsuario usuario={usuario} />
                </div>
                <div className='flex-shrink'>
                    <FichaBitacoraSesion id={usuario.id || ''} />
                </div>
            </div>
        </div>
    )
}

export default EditarUsuario
