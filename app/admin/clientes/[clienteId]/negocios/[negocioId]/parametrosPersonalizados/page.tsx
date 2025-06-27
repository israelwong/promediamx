import React from 'react'
import { Metadata } from 'next'
import CRMCamposPersonalizados from '../crm/configuracion/campos/components/CRMCamposPersonalizados';

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
            <CRMCamposPersonalizados negocioId={negocioId} />
        </>
    )
}
