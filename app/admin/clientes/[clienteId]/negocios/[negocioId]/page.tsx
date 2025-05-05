import React from 'react'
import { Metadata } from 'next'

import NegocioHeader from './components/NegocioHeader';
import NegocioConfiguracionResumen from './components/NegocioConfiguracionResumen';
import SuscripcionesDashboard from './components/SuscripcionesDashboard';
import CatalogoDashboard from './components/CatalogoDashboard';
import CRMEstadisticas from './components/CRMEstadisticas';
import NegocioOfertas from './components/(catalogo)/NegocioOfertas';
import NegocioGalerias from './components/NegocioGalerias';

export const metadata: Metadata = {
    title: 'Negocio',
    description: 'Editar negocio',
}

export default async function page({ params }: { params: Promise<{ negocioId: string, clienteId: string }> }) {
    const { negocioId, clienteId } = await params
    return (
        <>
            {/* Header del negocio */}
            <div className='mb-5'>
                <NegocioHeader negocioId={negocioId} />
            </div>

            <div className="">

                {/* Grid responsivo de 3 columnas en pantallas grandes */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-full mx-auto w-full"> {/* Ajustado max-w */}
                    <div className="lg:col-span-1">
                        <NegocioConfiguracionResumen clienteId={clienteId} negocioId={negocioId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <SuscripcionesDashboard negocioId={negocioId} clienteId={clienteId} />
                    </div>

                    <div className="flex flex-col gap-6 flex-grow">
                        <NegocioOfertas negocioId={negocioId} clienteId={clienteId} />
                        <NegocioGalerias negocioId={negocioId} clienteId={clienteId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <CatalogoDashboard clienteId={clienteId} negocioId={negocioId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <CRMEstadisticas clienteId={clienteId} negocioId={negocioId} />
                    </div>

                </div>
            </div>
        </>
    )
}
