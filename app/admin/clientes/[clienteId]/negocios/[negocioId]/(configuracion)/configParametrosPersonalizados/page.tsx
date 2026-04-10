import React from 'react'
import { Metadata } from 'next'
import CRMCamposPersonalizados from './components/CRMCamposPersonalizados';
import InstruccionesCampos from './components/InstruccionesCampos';

export const metadata: Metadata = {
    title: 'Configurar Campos Personalizados',
}

interface Props {
    negocioId: string;
}

export default async function page({ params }: { params: Promise<Props> }) {
    const { negocioId } = await params;
    return (
        <div className='grid grid-cols-5 gap-6 w-full h-full'>
            <div className='col-span-2'>
                <CRMCamposPersonalizados negocioId={negocioId} />
            </div>
            <div className='col-span-2'>
                <InstruccionesCampos />
            </div>
        </div>
    );
}
