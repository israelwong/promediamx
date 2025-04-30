import React from 'react'
import { Metadata } from 'next'
import PromocionEditarForm from '../components/PromocionEditarForm'

export const metadata: Metadata = {
    title: 'Editar promoción',
}

export default async function page({ params }: { params: Promise<{ promocionId: string }> }) {
    const { promocionId } = await params
    return <PromocionEditarForm promocionId={promocionId} />
}
