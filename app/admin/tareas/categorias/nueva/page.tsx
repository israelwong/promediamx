import React from 'react'
import { Metadata } from 'next'
import CategoriaNuevaForm from '../components/CategoriaNuevaForm'

export const metadata: Metadata = {
    title: 'Nueva Categoría',
}


export default function page() {
    return <CategoriaNuevaForm />
}
