//ruta actual: app/admin/clientes/[clienteId]/components/ClienteEditarForm.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Ajustar ruta a la NUEVA acción y tipos
import { obtenerNegociosPorClienteIdConDetalles, NegocioConDetalles } from '@/app/admin/_lib/negocio.actions';
// Ajustar ruta a tipos si es necesario
import { Loader2, ListX, ListChecks, PlusIcon, Building, Bot, Package, ChevronRight, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react'; // Iconos

interface Props {
    clienteId: string;
}

export default function ClienteNegocios({ clienteId }: Props) {
    const router = useRouter();
    const [negocios, setNegocios] = useState<NegocioConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const tableContainerClasses = "flex-grow overflow-y-auto -mx-4 md:-mx-5"; // Ajuste para que tabla ocupe espacio y tenga scroll interno
    const tableClasses = "w-full min-w-[650px]"; // Ancho mínimo tabla
    const thClasses = "px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-600 bg-zinc-700/50 sticky top-0 z-10"; // Header pegajoso
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
            // Usar la nueva acción que trae detalles
            const data = await obtenerNegociosPorClienteIdConDetalles(clienteId);
            setNegocios(data);
        } catch (err) {
            console.error("Error fetching negocios:", err);
            setError("No se pudieron cargar los negocios.");
            setNegocios([]);
        } finally {
            setLoading(false);
        }
    }, [clienteId]);

    useEffect(() => {
        fetchNegocios();
    }, [fetchNegocios]);

    // --- Cálculo de Precio Total por Negocio ---
    const calcularPrecioTotalNegocio = useCallback((negocio: NegocioConDetalles): number => {
        let totalNegocio = 0;
        negocio.AsistenteVirtual?.forEach(asistente => {
            // Sumar precio base del asistente
            totalNegocio += typeof asistente.precioBase === 'number' ? asistente.precioBase : 0;
            // Sumar tareas activas del asistente
            asistente.AsistenteTareaSuscripcion?.forEach(suscripcion => {
                if (suscripcion.status === 'activo' && typeof suscripcion.montoSuscripcion === 'number') {
                    totalNegocio += suscripcion.montoSuscripcion;
                }
            });
        });
        return totalNegocio;
    }, []); // Sin dependencias externas

    // --- Helpers ---
    const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const getStatusInfo = (status: NegocioConDetalles['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    // --- Navegación ---
    const handleCrearNegocio = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/nuevo`); // Pasar clienteId
    };

    const handleVerNegocio = (negocioId: string | undefined | null) => {
        if (negocioId) {
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Building size={16} /> Negocios
                </h3>
                <button onClick={handleCrearNegocio} className={buttonPrimaryClasses} title="Crear nuevo negocio">
                    <PlusIcon size={14} /> <span>Crear Negocio</span>
                </button>
            </div>

            {/* Contenido Principal: Tabla */}
            <div className={tableContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando negocios...</span></div>
                ) : error ? (
                    <div className="px-4 py-10 text-center"><ListX className="h-8 w-8 text-red-400 mx-auto mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : negocios.length === 0 ? (
                    <div className="px-4 py-10 text-center"><ListChecks className="h-8 w-8 text-zinc-500 mx-auto mb-2" /><p className='text-zinc-400 italic text-sm'>Este cliente no tiene negocios asociados.</p></div>
                ) : (
                    <table className={tableClasses}>
                        <thead>
                            <tr>
                                <th className={thClasses}>Nombre Negocio</th>
                                <th className={thClasses}>Status</th>
                                <th className={`${thClasses} text-center`}>Asistentes</th>
                                <th className={`${thClasses} text-center`}>Catálogos</th>
                                <th className={`${thClasses} text-right`}>Suscripción Total</th>
                                <th className={thClasses}></th>{/* Columna para chevron */}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                            {negocios.map((negocio) => {
                                const statusInfo = getStatusInfo(negocio.status);
                                const asistenteCount = negocio._count?.AsistenteVirtual ?? 0;
                                const catalogoCount = negocio._count?.Catalogo ?? 0;
                                const precioTotalNegocio = calcularPrecioTotalNegocio(negocio);

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
                                        <td className={`${tdClasses} text-center`}>
                                            <span className='flex items-center justify-center gap-1'>
                                                <Bot size={14} className='opacity-70' /> {asistenteCount}
                                            </span>
                                        </td>
                                        <td className={`${tdClasses} text-center`}>
                                            <span className='flex items-center justify-center gap-1'>
                                                <Package size={14} className='opacity-70' /> {catalogoCount}
                                            </span>
                                        </td>
                                        <td className={`${tdClasses} text-right font-medium text-emerald-400`}>
                                            {formatCurrency(precioTotalNegocio)}
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
