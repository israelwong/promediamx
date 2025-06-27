'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// --- IMPORTACIONES REFACTORIZADAS ---
// Apuntan a la nueva fuente única de verdad para acciones y tipos.
import { getClientesConDetalles } from '@/app/admin/_lib/actions/cliente/cliente.actions';
import type { ClienteConDetalles } from '@/app/admin/_lib/actions/cliente/cliente.schemas';
import { Button } from '@/app/components/ui/button'; // Importando tu componente de botón

// --- Iconos ---
import { Loader2, Search, Users, DollarSign, AlertTriangle, BadgeCheck, BadgeX, Filter, X as ClearFilterIcon, PlusCircle } from 'lucide-react';

export default function ClientesLista() {
    const router = useRouter();
    const [clientes, setClientes] = useState<ClienteConDetalles[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para filtros (sin cambios)
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroStatus, setFiltroStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');

    // Clases de Tailwind (sin cambios)
    const containerClasses = "bg-zinc-900 min-h-screen";
    const summaryCardClasses = "bg-zinc-800 p-4 rounded-lg shadow-md border border-zinc-700 flex items-center gap-3";
    const filterContainerClasses = "mb-6 p-4 bg-zinc-800 rounded-lg shadow-sm border border-zinc-700 flex flex-col sm:flex-row gap-4 items-center";
    const inputBaseClasses = "bg-zinc-700 border border-zinc-600 text-zinc-100 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-400";
    const filterButtonBase = "px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center gap-1.5";
    const filterButtonActive = "bg-blue-600 text-white";
    const filterButtonInactive = "bg-zinc-600 text-zinc-300 hover:bg-zinc-500";
    const tableContainerClasses = "overflow-x-auto bg-zinc-800 border border-zinc-700 rounded-lg shadow-md";
    const tableClasses = "w-full min-w-[800px]";
    const thClasses = "px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-600 bg-zinc-700/50";
    const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-zinc-200 border-b border-zinc-700";
    const trHoverClasses = "hover:bg-zinc-700/50 cursor-pointer transition-colors duration-100";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";

    // --- FUNCIÓN DE CARGA REFACTORIZADA ---
    // Utiliza la nueva acción y maneja el objeto ActionResult.
    const fetchClientes = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await getClientesConDetalles();
        if (result.success) {
            setClientes(result.data || []);
        } else {
            setError(result.error || 'Ocurrió un error desconocido.');
            console.error("Error fetching detailed clients:", result.error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchClientes();
    }, [fetchClientes]);

    // --- CÁLCULO DE PRECIO TOTAL (ACTUALIZADO) ---
    // Se ajusta a la estructura de datos que devuelve la nueva acción.
    const calcularPrecioTotalCliente = useCallback((cliente: ClienteConDetalles): number => {
        return cliente.Negocio?.reduce((totalNegocio, negocio) => {
            const totalAsistentes = negocio.AsistenteVirtual?.reduce((totalAsistente, asistente) => {
                const totalSuscripciones = asistente.AsistenteTareaSuscripcion.reduce((totalSuscripcion, suscripcion) => {
                    return totalSuscripcion + (suscripcion.montoSuscripcion ?? 0);
                }, 0);
                // Nota: precioBase del asistente no se incluye en la consulta actual.
                return totalAsistente + totalSuscripciones;
            }, 0) ?? 0;
            return totalNegocio + totalAsistentes;
        }, 0) ?? 0;
    }, []);


    // --- Lógica de filtrado y resumen (sin cambios) ---
    const clientesFiltrados = useMemo(() => {
        return clientes.filter(cliente => {
            const nombreMatch = !filtroNombre || cliente.nombre?.toLowerCase().includes(filtroNombre.toLowerCase());
            const statusMatch = filtroStatus === 'todos' || cliente.status === filtroStatus;
            return nombreMatch && statusMatch;
        });
    }, [clientes, filtroNombre, filtroStatus]);

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


    // --- Helpers y navegación (sin cambios) ---
    const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    const getStatusInfo = (status: string | null) => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            case 'archivado': return { text: 'Archivado', color: 'bg-yellow-500/20 text-yellow-400', icon: BadgeX };
            default: return { text: 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };
    const handleVerCliente = (clienteId: string) => router.push(`/admin/clientes/${clienteId}`);


    if (loading) return <div className="flex justify-center items-center h-screen bg-zinc-900"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
    if (error) return <div className="p-6 text-center text-red-400" role="alert">Error: {error} <button onClick={fetchClientes} className="ml-2 underline">Reintentar</button></div>;

    return (
        <div className={containerClasses}>
            {/* --- NUEVA CABECERA CON TÍTULO Y BOTÓN --- */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Clientes</h1>
                <Button onClick={() => router.push('/admin/clientes/nuevo')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Cliente
                </Button>
            </div>

            {/* Resumen General (sin cambios) */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
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

            {/* Tabla de Clientes (actualizada para usar los nuevos datos) */}
            {clientesFiltrados.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">No hay clientes que coincidan con los filtros.</div>
            ) : (
                <div className={tableContainerClasses}>
                    <table className={tableClasses}>
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className={thClasses}>Nombre Cliente</th>
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
