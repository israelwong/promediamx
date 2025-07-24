import React from 'react'
import { Metadata } from 'next'
import CRMEtiquetas from './components/CRMEtiquetas';
import InstruccionesEtiquetas from './components/InstruccionesEtiquetas';

export const metadata: Metadata = {
    title: 'Configurar Etiquetas',
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return (
        <div className='grid grid-cols-5 gap-6 w-full h-full'>
            <div className='col-span-2'>
                <CRMEtiquetas negocioId={negocioId} />
            </div>
            <div className='col-span-2'>
                <InstruccionesEtiquetas />
            </div>
        </div>
    )
}
