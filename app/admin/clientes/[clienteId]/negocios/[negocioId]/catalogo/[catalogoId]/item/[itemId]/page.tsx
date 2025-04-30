import React from 'react'
import { Metadata } from 'next'
import ItemEditarForm from '../components/ItemEditarForm'

export const metadata: Metadata = {
    title: 'Editar item',
}

export default async function page({ params }: { params: Promise<{ itemId: string, negocioId: string }> }) {
    const { itemId } = await params
    return <ItemEditarForm itemId={itemId} />
}
