'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import from next/navigation for App Router

// Ajusta la ruta a tus acciones y tipos
import { obtenerCRM } from '@/app/admin/_lib/crm.actions'; // Asegúrate que esta acción exista y esté actualizada
import { CRM as CRMType } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2, ListX, Users, UserPlus, Settings, DatabaseZap, PlusIcon } from 'lucide-react'; // Iconos

interface CRMConConteo extends CRMType {
    _count?: {
        Lead?: number;
        Agente?: number;
    };

}

interface Props {
    negocioId: string;
}

export default function NegocioCRM({ negocioId }: Props) {
    const router = useRouter();
    const [crmData, setCrmData] = useState<CRMConConteo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const contentContainerClasses = "flex-grow flex flex-col items-center justify-center text-center"; // Centrar contenido si no hay CRM
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const statCardClasses = "bg-zinc-700/50 p-4 rounded-lg flex items-center gap-3";
    const statValueClasses = "text-2xl font-bold text-white";
    const statLabelClasses = "text-sm text-zinc-400";

    // --- Función para cargar datos del CRM ---
    const fetchCRMData = useCallback(async () => {
        if (!negocioId) {
            setError("ID de Negocio no proporcionado.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setCrmData(null); // Limpiar datos previos

        try {
            // La acción debe buscar por negocioId y usar _count
            const data = await obtenerCRM(negocioId);
            setCrmData(data as unknown as CRMConConteo | null); // Puede ser null si no existe CRM para el negocio
        } catch (err) {
            console.error("Error al obtener los datos del CRM:", err);
            setError("No se pudo cargar la información del CRM.");
            setCrmData(null);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    // --- Carga inicial ---
    useEffect(() => {
        fetchCRMData();
    }, [fetchCRMData]);

    // --- Navegación ---
    const handleGestionarCRM = () => {
        if (crmData?.id) {
            // Ajusta esta ruta a tu estructura real para gestionar el CRM
            router.push(`/admin/crm/${crmData.id}`);
        } else {
            // Opcional: Navegar a una página para crear el CRM si no existe
            console.warn("Intento de gestionar CRM sin ID");
            // router.push(`/admin/crm/nuevo?negocioId=${negocioId}`);
        }
    };

    // --- Renderizado del Contenido ---
    const renderContent = () => {
        if (loading) {
            return (
                <div className={contentContainerClasses}>
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                    <p className="mt-2 text-zinc-400">Cargando CRM...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className={contentContainerClasses}>
                    <ListX className="h-10 w-10 text-red-400 mb-2" />
                    <p className="text-red-400 text-base">{error}</p>
                </div>
            );
        }
        // Si no hay error, pero no se encontró un CRM para este negocio
        if (!crmData) {
            return (
                <div className={contentContainerClasses}>
                    <DatabaseZap className="h-10 w-10 text-zinc-500 mb-3" />
                    <p className='text-zinc-400 italic text-base mb-3'>Este negocio aún no tiene un CRM activado.</p>
                    {/* <button onClick={handleActivateCRM} className={buttonPrimaryClasses}>Activar CRM</button> */}
                </div>
            );
        }

        // Si hay datos del CRM, mostrar las estadísticas
        const leadCount = crmData._count?.Lead ?? 0;
        const agentCount = crmData._count?.Agente ?? 0;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Tarjeta Leads */}
                <div className={statCardClasses}>
                    <Users size={28} className="text-blue-400 flex-shrink-0" />
                    <div>
                        <div className={statValueClasses}>{leadCount}</div>
                        <div className={statLabelClasses}>Lead(s)</div>
                    </div>
                </div>

                {/* Tarjeta Agentes */}
                <div className={statCardClasses}>
                    <UserPlus size={28} className="text-teal-400 flex-shrink-0" />
                    <div>
                        <div className={statValueClasses}>{agentCount}</div>
                        <div className={statLabelClasses}>Agente(s)</div>
                    </div>
                </div>
            </div>
        );
    };


    // --- Renderizado Principal ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <DatabaseZap size={16} /> CRM
                </h3>
                {/* Mostrar botón solo si hay CRM o si no está cargando/error */}
                {!loading && !error && crmData && (
                    <button
                        onClick={handleGestionarCRM}
                        className={buttonPrimaryClasses}
                        title="Gestionar CRM"
                        disabled={!crmData} // Deshabilitar si no hay crmData
                    >
                        <Settings size={14} /> <span>Gestionar</span>
                    </button>
                )}
                {/* Opcional: Mostrar botón Crear si no hay CRM */}
                {!loading && !error && !crmData && (
                    <button
                        // onClick={handleActivateCRM} // Necesitarías esta función
                        className={`${buttonPrimaryClasses} bg-green-600 hover:bg-green-700`}
                        title="Activar CRM para este negocio"
                    >
                        <PlusIcon size={14} /> <span>Activar CRM</span>
                    </button>
                )}
            </div>

            {/* Contenido Principal */}
            {renderContent()}

        </div>
    );
}
