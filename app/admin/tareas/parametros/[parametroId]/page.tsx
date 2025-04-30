import React from 'react'
import { Metadata } from 'next'
import ParametroEditarForm from '../components/ParametroEditarForm'

export const metadata: Metadata = {
    title: 'Detalles del parametro',
}

export default async function page({ params }: { params: Promise<{ parametroId: string }> }) {
    const { parametroId } = await params
    return <ParametroEditarForm parametroId={parametroId} />
}
