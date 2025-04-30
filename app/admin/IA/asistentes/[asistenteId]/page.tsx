import React from 'react'
import { Metadata } from 'next'
import AsistenteEditarForm from '../components/AsistenteEditarForm'
import AsistenteTareas from '../components/AsistenteTareas'

export const metadata: Metadata = {
    title: 'Detalles del asistente',
}

export default async function page({ params }: { params: Promise<{ asistenteId: string }> }) {
    const { asistenteId } = await params
    return (
        <div>
            <div className="grid grid-cols-2 gap-4">
                <AsistenteEditarForm asistenteId={asistenteId} />
                <AsistenteTareas asistenteId={asistenteId} />
            </div>
        </div>
    )
}