// app/admin/clientes/[clienteId]/components/ClienteNegociosList.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// 1. Importar la nueva acción y el nuevo schema
import { obtenerNegociosPorClienteId } from '@/app/admin/_lib/actions/negocio/negocio.actions';
import { Negocio } from '@/app/admin/_lib/actions/negocio/negocio.schemas';

// 2. Importar los iconos necesarios
import { Loader2, ListX, ListChecks, PlusIcon, Building, ChevronRight, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react';

interface Props {
    clienteId: string;
}

export default function ClienteNegociosList({ clienteId }: Props) {
    const router = useRouter();
    // 3. El estado ahora usa el tipo de dato simplificado 'Negocio'
    const [negocios, setNegocios] = useState<Negocio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Estilos de Tailwind (sin cambios) ---
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const tableContainerClasses = "flex-grow overflow-y-auto -mx-4 md:-mx-5";
    const tableClasses = "w-full min-w-[400px]"; // Ancho mínimo reducido
    const thClasses = "px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-600 bg-zinc-700/50 sticky top-0 z-10";
    const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-zinc-200 border-b border-zinc-700";
    const trHoverClasses = "hover:bg-zinc-700/50 cursor-pointer transition-colors duration-100";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";

    // --- Función para cargar negocios ---
    const fetchNegocios = useCallback(async () => {
        if (!clienteId) return;
        setLoading(true);
        setError(null);
        try {
            // 4. Usar la nueva acción simplificada
            const result = await obtenerNegociosPorClienteId(clienteId);
            if (result.success) {
                setNegocios(result.data ?? []);
            } else {
                setError(result.error || "No se pudieron cargar los negocios.");
                setNegocios([]);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "No se pudieron cargar los negocios.";
            console.error("Error fetching negocios:", err);
            setError(errorMessage);
            setNegocios([]);
        } finally {
            setLoading(false);
        }
    }, [clienteId]);

    useEffect(() => {
        fetchNegocios();
    }, [fetchNegocios]);

    // --- Helpers ---
    const getStatusInfo = (status: Negocio['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: AlertTriangle };
        }
    };

    // --- Navegación (sin cambios) ---
    const handleCrearNegocio = () => router.push(`/admin/clientes/${clienteId}/negocios/nuevo`);
    const handleVerNegocio = (negocioId: string) => router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Building size={16} /> Negocios Asociados
                </h3>
                <button onClick={handleCrearNegocio} className={buttonPrimaryClasses} title="Crear nuevo negocio">
                    <PlusIcon size={14} /> <span>Crear Negocio</span>
                </button>
            </div>

            <div className={tableContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando negocios...</span></div>
                ) : error ? (
                    <div className="px-4 py-10 text-center"><ListX className="h-8 w-8 text-red-400 mx-auto mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : negocios.length === 0 ? (
                    <div className="px-4 py-10 text-center"><ListChecks className="h-8 w-8 text-zinc-500 mx-auto mb-2" /><p className='text-zinc-400 italic text-sm'>Este cliente no tiene negocios asociados.</p></div>
                ) : (
                    // 5. Tabla simplificada
                    <table className={tableClasses}>
                        <thead>
                            <tr>
                                <th className={thClasses}>Nombre del Negocio</th>
                                <th className={thClasses}>Status</th>
                                <th className={thClasses}></th>{/* Columna para chevron */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                            {negocios.map((negocio) => {
                                const statusInfo = getStatusInfo(negocio.status);
                                return (
                                    <tr
                                        key={negocio.id}
                                        className={trHoverClasses}
                                        onClick={() => handleVerNegocio(negocio.id)}
                                        title={`Ver detalles de ${negocio.nombre || 'negocio'}`}
                                    >
                                        <td className={tdClasses}>
                                            <span className="font-medium text-white">{negocio.nombre || '-'}</span>
                                        </td>
                                        <td className={tdClasses}>
                                            <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                <statusInfo.icon size={12} />
                                                {statusInfo.text}
                                            </span>
                                        </td>
                                        <td className={`${tdClasses} text-right`}>
                                            <ChevronRight size={16} className="text-zinc-500" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
