import React from 'react'
import { Metadata } from 'next'
import CRMAgentes from './components/CRMAgentes';
import InstruccionesAgente from './components/InstruccionesAgente';


export const metadata: Metadata = {
    title: 'Configurar Agentes',
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return (
        <div className='grid grid-cols-5 gap-6 w-full h-full '>
            <div className='col-span-2'>
                <CRMAgentes negocioId={negocioId} />
            </div>
            <div className='col-span-2'>
                <InstruccionesAgente />
            </div>
        </div>

    )
}
