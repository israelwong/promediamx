
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlusIcon, Bot, } from 'lucide-react'; // Iconos
import { AsistenteCard } from './AsistenteCard';

// NUEVAS IMPORTS
import { obtenerAsistentesParaListaAction } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.actions';
import type { AsistenteEnListaData } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteVirtual.schemas';

interface Props {
    negocioId: string;
    clienteId: string;
}

// (Aquí iría la definición del componente AsistenteCard si no lo importas de otro archivo)

export default function AsistenteLista({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [asistentes, setAsistentes] = useState<AsistenteEnListaData[]>([]); // Usar nuevo tipo
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases Tailwind
    // const containerClasses = "p-4 sm:p-6 bg-zinc-800/50 flex flex-col h-full rounded-lg"; // Contenedor principal de la sección de asistentes
    const containerClasses = "p-3 bg-zinc-800/0 flex flex-col h-full"; // Fondo más sutil
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4"; // Más margen inferior
    const titleClasses = "text-lg font-semibold text-zinc-100 whitespace-nowrap flex items-center gap-2"; // Título más grande
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap shadow-md"; // Botón más prominente

    // Clases para el grid de "fichas"
    const gridContainerClasses = "flex-grow overflow-y-auto -mr-3 pr-3"; // Para el scroll
    const gridClasses = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"; // Grid responsivo

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await obtenerAsistentesParaListaAction(negocioId); // Llamar a la nueva action
        if (result.success && result.data) {
            setAsistentes(result.data);
        } else {
            console.error("Error al obtener asistentes:", result.error);
            setError(result.error || "No se pudieron cargar los asistentes.");
            setAsistentes([]);
        }
        setLoading(false);
    }, [negocioId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCrearAsistente = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/nuevo`);
    };

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h2 className={titleClasses}> {/* Cambiado a h2 para mejor semántica */}
                    <Bot size={22} /> Mis Asistentes Virtuales
                </h2>
                <button onClick={handleCrearAsistente} className={buttonPrimaryClasses} title="Crear nuevo asistente">
                    <PlusIcon size={16} /> <span>Crear Asistente</span>
                </button>
            </div>

            {error && <p className="mb-4 text-center text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30">{error}</p>}

            <div className={gridContainerClasses}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-10">
                        <Loader2 className="h-8 w-8 animate-spin mb-3" />
                        <span>Cargando asistentes...</span>
                    </div>
                ) : asistentes.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center h-full py-10 bg-zinc-800 border border-dashed border-zinc-700 rounded-lg p-8">
                        <Bot className="h-12 w-12 text-zinc-500 mb-4" />
                        <h4 className="text-md font-semibold text-zinc-200 mb-1">No hay asistentes creados</h4>
                        <p className='text-zinc-400 text-sm'>Empieza creando tu primer asistente virtual para este negocio.</p>
                        <button onClick={handleCrearAsistente} className={`${buttonPrimaryClasses} mt-6`} title="Crear nuevo asistente">
                            <PlusIcon size={16} /> <span>Crear Mi Primer Asistente</span>
                        </button>
                    </div>
                ) : (
                    <div className={gridClasses}>
                        {asistentes.map((asistente) => (
                            <AsistenteCard
                                key={asistente.id}
                                asistente={asistente}
                                clienteId={clienteId}
                                negocioId={negocioId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}