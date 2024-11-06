'use client'
import FormEditarServicio from '../../_components/FormEditarServicio'
import { useParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Servicio } from '../../../../../_lib/Types'
import { obtenerServicio } from '../../../../../_lib/Servicios'

interface Params {
    [key: string]: string
}

function EditarUsuario() {
    const params = useParams<Params>()
    const { id } = params
    const [servicio, setServicio] = useState({} as Servicio)

    useEffect(() => {
        async function fetchServicio() {
            const servicio = await obtenerServicio(id)
            if (servicio) setServicio(servicio)
        }
        fetchServicio()
    }, [id])

    return <FormEditarServicio servicio={servicio} />
}

export default EditarUsuario

