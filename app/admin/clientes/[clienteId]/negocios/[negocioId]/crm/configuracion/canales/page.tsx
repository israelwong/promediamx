import React from 'react'
import { Metadata } from 'next'
import CRMCanal from './components/CRMCanal';
import InstruccionesCanales from './components/InstruccionCanales';

export const metadata: Metadata = {
    title: 'Configurar Canales',
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return (
        <div className='grid grid-cols-5 gap-6 w-full h-full'>
            <div className='col-span-2'>
                <CRMCanal negocioId={negocioId} />
            </div>
            <div className='col-span-2'>
                <InstruccionesCanales />
            </div>
        </div>
    );
}
