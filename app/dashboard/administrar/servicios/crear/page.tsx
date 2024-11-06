import React from 'react'
import { Metadata } from 'next'
import FormCrearServicio from '../_components/FormCrearServicio'

export const metadata: Metadata = {
    title: 'Crear Servicio',
}

function page() {
    return <FormCrearServicio />
}

export default page
