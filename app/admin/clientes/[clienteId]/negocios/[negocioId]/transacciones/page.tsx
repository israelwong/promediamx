import React from 'react'
import { Metadata } from 'next'
import PagosHistorial from './components/PagosHistorial';

export const metadata: Metadata = {
    title: 'Parámetros Personalizados'
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params
    console.log(negocioId);
    return (
        <>
            <PagosHistorial negocioId={negocioId} />
        </>
    )
}
