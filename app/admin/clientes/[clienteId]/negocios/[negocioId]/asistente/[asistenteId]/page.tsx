// Ruta actual: /admin/clientes/[clienteId]/negocios/[negocioId]/asistente/[asistenteId]/page.tsx

import React from 'react'
import { Metadata } from 'next'

import AsistenteEditarForm from './components/AsistenteEditarForm';
import AsistenteTareas from './components/AsistenteTareas'; // Este será rediseñado después para separar tareas
import { AsistenteWhatsAppConfig } from './components/AsistenteWhatsAppConfig';
import AsistenteEstadisticas from './components/AsistenteEstadisticas';

import { obtenerAsistenteVirtualPorId } from '@/app/admin/_lib/asistenteVirtual.actions';

export const metadata: Metadata = {
    title: 'Detalles del Asistente',
    description: 'Asistente virtual',
}

export default async function page({ params }: { params: Promise<{ clienteId: string; negocioId: string; asistenteId: string }> }) {

    const pageContainerClasses = "";
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-6 items-start";
    const mainColumnClasses = "lg:col-span-1 flex flex-col gap-4";
    const sidebarColumnClasses = "lg:col-span-2 flex flex-col gap-6 overflow-y-auto max-h-screen"; // O una max-h calculada

    const { asistenteId, clienteId, negocioId } = await params;

    const asistente = await obtenerAsistenteVirtualPorId(asistenteId);

    return (
        <div className={pageContainerClasses}>
            <div className={`${gridContainerClasses} h-full min-h-screen`}>
                {/* Columna Principal (Formulario de Edición) */}
                <div className={`${mainColumnClasses} h-full`}>
                    <div className="flex flex-col h-full">
                        <AsistenteEditarForm
                            asistenteId={asistenteId}
                            clienteIdOriginal={clienteId}
                            negocioIdOriginal={negocioId}
                        />
                    </div>
                </div>

                <div className={`${mainColumnClasses} h-full`}>
                    <div className={`${sidebarColumnClasses} flex flex-col gap-4 overflow-y-auto`}>
                        <div className="flex-1 flex flex-col">
                            <AsistenteWhatsAppConfig
                                asistenteId={asistenteId}
                                clienteId={clienteId}
                                negocioId={negocioId}
                                asistenteConfig={{
                                    whatsappBusiness: asistente?.whatsappBusiness ?? null,
                                    phoneNumberId: asistente?.phoneNumberId ?? null,
                                    whatsappDisplayName: asistente?.whatsappDisplayName ?? null,
                                    whatsappBusinessAccountId: asistente?.whatsappBusinessAccountId ?? null,
                                    whatsappConnectionStatus: asistente?.whatsappConnectionStatus ?? null,
                                }}
                            />
                        </div>
                        <div className="flex-shrink-0">
                            <AsistenteEstadisticas asistenteId={asistenteId} />
                        </div>
                    </div>
                </div>

                {/* Columna Lateral (Tareas) */}
                <div className={`${sidebarColumnClasses} `}>
                    <div className="">
                        <AsistenteTareas
                            asistenteId={asistenteId}
                            clienteId={clienteId}
                            negocioId={negocioId}
                        />
                        {/* El widget de AsistenteCosto podría ir aquí también en el futuro */}
                    </div>
                </div>
            </div>
        </div>
    );
}
