'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Ajustar ruta a la acción y tipos (debe incluir fechaProximoPago)
import { obtenerClientesConDetalles } from '@/app/admin/_lib/cliente.actions';
// Ajustar ruta a tipos si es necesario
import { ClienteConDetalles } from '@/app/admin/_lib/types';
import { Loader2, Search, Users, DollarSign, AlertTriangle, BadgeCheck, BadgeX, Filter, X as ClearFilterIcon } from 'lucide-react'; // Iconos

// Asegúrate que este tipo incluya fechaProximoPago si lo usas
// export interface ClienteConDetalles extends Cliente { ... fechaProximoPago?: Date | null; ... }

export default function ClientesLista() {
    const router = useRouter();
    const [clientes, setClientes] = useState<ClienteConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para filtros
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroStatus, setFiltroStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');

    // Clases de Tailwind
    const containerClasses = "bg-zinc-900 min-h-screen";
    const headerClasses = "mb-6";
    const summaryCardClasses = "bg-zinc-800 p-4 rounded-lg shadow-md border border-zinc-700 flex items-center gap-3";
    const filterContainerClasses = "mb-6 p-4 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 flex flex-col sm:flex-row gap-4 items-center";
    const inputBaseClasses = "bg-zinc-700 border border-zinc-600 text-zinc-100 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-400";
    const filterButtonBase = "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center gap-1.5";
    const filterButtonActive = "bg-blue-600 text-white";
    const filterButtonInactive = "bg-zinc-600 text-zinc-300 hover:bg-zinc-500";

    // Clases para la Tabla
    const tableContainerClasses = "overflow-x-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-md"; // Contenedor para scroll horizontal si es necesario
    const tableClasses = "w-full min-w-[800px]"; // Ancho mínimo para evitar que se comprima demasiado
    const thClasses = "px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-600 bg-zinc-700/50";
    const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-zinc-200 border-b border-zinc-700";
    const trHoverClasses = "hover:bg-zinc-700/50 cursor-pointer transition-colors duration-100"; // Estilo hover para filas
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1"; // inline-flex

    // --- Función para cargar clientes (sin cambios) ---
    const fetchClientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await obtenerClientesConDetalles();
            setClientes(response);
        } catch (err) {
            console.error("Error fetching detailed clients:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClientes();
    }, [fetchClientes]);

    // --- Cálculo de Precio Total por Cliente (sin cambios) ---
    const calcularPrecioTotalCliente = useCallback((cliente: ClienteConDetalles): number => {
        let totalCliente = 0;
        cliente.Negocio?.forEach((negocio) => {
            negocio.AsistenteVirtual?.forEach((asistente) => {
                // Removed unused assignment of AsistenteTareaSuscripcion
                totalCliente += typeof asistente.precioBase === 'number' ? asistente.precioBase : 0;
                asistente.AsistenteTareaSuscripcion?.forEach(suscripcion => {
                    if (suscripcion.status === 'activo' && typeof suscripcion.montoSuscripcion === 'number') {
                        totalCliente += suscripcion.montoSuscripcion;
                    }
                });
            });
        });
        return totalCliente;
    }, []);

    // --- Filtrado de Clientes (sin cambios) ---
    const clientesFiltrados = useMemo(() => {
        return clientes.filter(cliente => {
            const nombreMatch = !filtroNombre || cliente.nombre?.toLowerCase().includes(filtroNombre.toLowerCase());
            const statusMatch = filtroStatus === 'todos' || cliente.status === filtroStatus;
            return nombreMatch && statusMatch;
        });
    }, [clientes, filtroNombre, filtroStatus]);

    // --- Cálculo de Resumen General (sin cambios) ---
    const resumenGeneral = useMemo(() => {
        let totalFacturacionActiva = 0;
        let clientesActivosCount = 0;
        let clientesInactivosCount = 0;
        clientes.forEach(cliente => {
            if (cliente.status === 'activo') {
                clientesActivosCount++;
                totalFacturacionActiva += calcularPrecioTotalCliente(cliente);
            } else {
                clientesInactivosCount++;
            }
        });
        return { totalFacturacionActiva, clientesActivosCount, clientesInactivosCount };
    }, [clientes, calcularPrecioTotalCliente]);

    // --- Helpers (sin cambios) ---
    const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Fecha inválida'; }
    };
    const getStatusInfo = (status: ClienteConDetalles['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    // --- Navegación ---
    const handleVerCliente = (clienteId: string | undefined) => {
        if (clienteId) {
            router.push(`/admin/clientes/${clienteId}`);
        }
    };


    // --- Renderizado ---
    if (loading) {
        return <div className="flex justify-center items-center h-screen bg-zinc-900"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-400" role="alert">Error: {error} <button onClick={fetchClientes} className="ml-2 underline">Reintentar</button></div>;
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera con Resumen (sin cambios) */}
            <div className={`${headerClasses} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
                <div className={summaryCardClasses}><DollarSign size={24} className="text-emerald-500" /><div><div className="text-xl font-bold text-white">{formatCurrency(resumenGeneral.totalFacturacionActiva)}</div><div className="text-xs text-zinc-400">Facturación Mensual (Activos)</div></div></div>
                <div className={summaryCardClasses}><Users size={24} className="text-blue-500" /><div><div className="text-xl font-bold text-white">{resumenGeneral.clientesActivosCount}</div><div className="text-xs text-zinc-400">Clientes Activos</div></div></div>
                <div className={summaryCardClasses}><Users size={24} className="text-zinc-500" /><div><div className="text-xl font-bold text-white">{resumenGeneral.clientesInactivosCount}</div><div className="text-xs text-zinc-400">Clientes Inactivos</div></div></div>
            </div>

            {/* Filtros (sin cambios) */}
            <div className={filterContainerClasses}>
                <div className="relative flex-grow w-full sm:w-auto"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-zinc-400" /></div><input type="text" placeholder="Buscar por nombre..." className={`${inputBaseClasses} pl-10`} value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} /></div>
                <div className="flex items-center gap-2 flex-shrink-0"><span className="text-sm text-zinc-400"><Filter size={14} className="inline mr-1" /> Status:</span><button onClick={() => setFiltroStatus('todos')} className={`${filterButtonBase} ${filtroStatus === 'todos' ? filterButtonActive : filterButtonInactive}`}>Todos</button><button onClick={() => setFiltroStatus('activo')} className={`${filterButtonBase} ${filtroStatus === 'activo' ? filterButtonActive : filterButtonInactive}`}><BadgeCheck size={14} /> Activos</button><button onClick={() => setFiltroStatus('inactivo')} className={`${filterButtonBase} ${filtroStatus === 'inactivo' ? filterButtonActive : filterButtonInactive}`}><BadgeX size={14} /> Inactivos</button></div>
                {(filtroNombre || filtroStatus !== 'todos') && (<button onClick={() => { setFiltroNombre(''); setFiltroStatus('todos'); }} className={`${filterButtonBase} bg-red-600/20 text-red-400 hover:bg-red-600/40`} title="Limpiar filtros"><ClearFilterIcon size={14} /> Limpiar</button>)}
            </div>

            {/* --- Tabla de Clientes --- */}
            {clientesFiltrados.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No hay clientes que coincidan con los filtros.</div>
            ) : (
                <div className={tableContainerClasses}>
                    <table className={tableClasses}>
                        <thead className="sticky top-0 z-10">{/* Header pegajoso */}
                            <tr>
                                <th className={`${thClasses}`}>Nombre Cliente</th>
                                <th className={`${thClasses} text-center`}>Status</th>
                                <th className={`${thClasses} text-center`}>Registro</th>
                                <th className={`${thClasses} text-center`}>Negocios</th>
                                <th className={`${thClasses} text-center`}>Asistentes</th>
                                <th className={`${thClasses} text-right`}>Suscripción Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                            {clientesFiltrados.map((cliente) => {
                                const statusInfo = getStatusInfo(cliente.status);
                                const negocioCount = cliente._count?.Negocio ?? 0;
                                const asistenteCount = cliente.Negocio?.reduce((sum, neg) => sum + (neg.AsistenteVirtual?.length ?? 0), 0) ?? 0;
                                const precioTotalCliente = calcularPrecioTotalCliente(cliente);

                                return (
                                    <tr
                                        key={cliente.id}
                                        className={trHoverClasses}
                                        onClick={() => handleVerCliente(cliente.id)}
                                        title={`Ver detalles de ${cliente.nombre || 'cliente'}`}
                                    >
                                        <td className={tdClasses}>
                                            <div className="font-medium text-white">{cliente.nombre || '-'}</div>
                                            {/* Opcional: Mostrar email debajo */}
                                            {cliente.email && <div className="text-xs text-zinc-400">{cliente.email}</div>}
                                        </td>
                                        <td className={`${tdClasses} text-center`}>
                                            <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                <statusInfo.icon size={12} />
                                                {statusInfo.text}
                                            </span>
                                        </td>
                                        <td className={`${tdClasses} text-center`}>{formatDate(cliente.createdAt)}</td>
                                        <td className={`${tdClasses} text-center`}>{negocioCount}</td>
                                        <td className={`${tdClasses} text-center`}>{asistenteCount}</td>
                                        <td className={`${tdClasses} text-right font-medium text-emerald-400`}>
                                            {formatCurrency(precioTotalCliente)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
