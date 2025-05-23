// Ruta actual: /admin/clientes/[clienteId]/negocios/[negocioId]/asistente/[asistenteId]/page.tsx

import React from 'react'
import { Metadata } from 'next'

import AsistenteEditarForm from './components/AsistenteEditarForm';
import AsistenteTareas from './components/AsistenteTareas'; // Este será rediseñado después para separar tareas

export const metadata: Metadata = {
    title: 'Detalles del Asistente',
    description: 'Asistente virtual',
}

export default async function page({ params }: { params: Promise<{ clienteId: string; negocioId: string; asistenteId: string }> }) {

    const pageContainerClasses = "";
    const gridContainerClasses = "grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-6 items-start";
    const mainColumnClasses = "lg:col-span-1 flex flex-col gap-6";
    const sidebarColumnClasses = "lg:col-span-1 flex flex-col gap-6 overflow-y-auto max-h-screen"; // O una max-h calculada


    const { clienteId, negocioId, asistenteId } = await params;
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
                        {/* Aquí podrías añadir AsistenteEstadisticas si decides que sea un componente más pequeño debajo del form */}
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
