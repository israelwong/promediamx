import React from 'react'
import { Metadata } from 'next'
import CRMPipeline from './components/CRMPipeline';
import InstruccionesPipeline from './components/InstruccionesPipeline';

export const metadata: Metadata = {
    title: 'Configurar Pipeline',
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return (
        <div className='grid grid-cols-5 gap-6 w-full h-full'>
            <div className='col-span-2'>
                <CRMPipeline negocioId={negocioId} />
            </div>
            <div className='col-span-2'>
                <InstruccionesPipeline />
            </div>
        </div>
    )
}
