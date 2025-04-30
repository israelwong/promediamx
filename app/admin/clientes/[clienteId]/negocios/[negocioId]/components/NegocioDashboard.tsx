'use client';

import React from 'react';
import NegocioHeader from './NegocioHeader';
import NegocioEditarForm from './NegocioEditForm'; // Asumiendo que este es el componente correcto
import SuscripcionesDashboard from './SuscripcionesDashboard';
import CatalogoDashboard from './CatalogoDashboard';
import CRMDashboard from './CRMDashboard';

interface Props {
    negocioId: string;
    clienteId: string; // Agregado clienteId
}

export default function NegocioDashboard({ negocioId, clienteId }: Props) {

    return (
        <>
            {/* Header del negocio */}
            <div className='mb-5'>
                <NegocioHeader negocioId={negocioId} />
            </div>

            <div className="">

                {/* Grid responsivo de 3 columnas en pantallas grandes */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-full mx-auto w-full"> {/* Ajustado max-w */}
                    <div className="lg:col-span-1">
                        <NegocioEditarForm negocioId={negocioId} clienteId={clienteId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <SuscripcionesDashboard negocioId={negocioId} clienteId={clienteId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <CatalogoDashboard negocioId={negocioId} />
                    </div>

                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <CRMDashboard negocioId={negocioId} />
                    </div>

                </div>
            </div>
        </>
    );
}