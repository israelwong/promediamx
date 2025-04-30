'use client';

import React, { useEffect, useState, useCallback } from 'react';
// import { useRouter } from 'next/navigation';
// Ajustar ruta a la NUEVA acción y tipos
import { obtenerDatosFacturacionCliente, DatosFacturacionCliente } from '@/app/admin/_lib/facturacion.actions'; // O donde esté tu acción
import { Factura } from '@/app/admin/_lib/types'; // Importar tipo Factura si es necesario
import { Loader2, AlertTriangle, CalendarClock, Receipt, BadgeCheck, BadgeX, CircleDollarSign, ExternalLink } from 'lucide-react'; // Iconos

interface Props {
    clienteId: string;
}

export default function ClienteFacturacion({ clienteId }: Props) {
    // const router = useRouter();
    const [facturacionData, setFacturacionData] = useState<DatosFacturacionCliente | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const sectionClasses = "mb-6"; // Espacio entre secciones
    const sectionTitleClasses = "text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2";
    const nextInvoiceCardClasses = "bg-zinc-700/50 p-4 rounded-lg border border-zinc-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3";
    const historyTableContainerClasses = "overflow-x-auto";
    const tableClasses = "w-full min-w-[500px]";
    const thClasses = "px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-600 bg-zinc-700/50";
    const tdClasses = "px-3 py-2 whitespace-nowrap text-sm text-zinc-200 border-b border-zinc-700";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";

    // --- Carga de datos ---
    const fetchData = useCallback(async () => {
        if (!clienteId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerDatosFacturacionCliente(clienteId);
            setFacturacionData(data);
        } catch (err) {
            console.error("Error fetching billing data:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos.");
            setFacturacionData(null);
        } finally {
            setLoading(false);
        }
    }, [clienteId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Helpers ---
    const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Fecha inválida'; }
    };
    const formatPeriod = (start: Date | string | null | undefined, end: Date | string | null | undefined): string => {
        if (!start || !end) return 'N/A';
        return `${formatDate(start)} - ${formatDate(end)}`;
    };
    const getInvoiceStatusInfo = (status: Factura['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status?.toLowerCase()) {
            case 'pagada': return { text: 'Pagada', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'pendiente': return { text: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400', icon: CalendarClock };
            case 'vencida': return { text: 'Vencida', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle };
            case 'fallida': return { text: 'Fallida', color: 'bg-red-600/30 text-red-500', icon: BadgeX };
            case 'cancelada': return { text: 'Cancelada', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    // --- Renderizado ---
    if (loading) {
        return <div className={`${containerClasses} items-center justify-center`}>
            <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando negocios...</span></div>
        </div>;
    }
    if (error) {
        return <div className={`${containerClasses} items-center justify-center text-red-400`}><AlertTriangle className="h-6 w-6 mr-2" /> {error}</div>;
    }
    if (!facturacionData) {
        return <div className={`${containerClasses} items-center justify-center text-zinc-500`}>No hay datos de facturación disponibles.</div>;
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera (Simple) */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Receipt size={16} /> Facturación Cliente
                </h3>
                {/* Podrías añadir botones aquí si es necesario */}
            </div>

            {/* Contenido Principal */}
            <div className="flex-grow overflow-y-auto pr-1">

                {/* Sección Próxima Facturación */}
                <div className={sectionClasses}>
                    <h4 className={sectionTitleClasses}>
                        <CalendarClock size={15} className="text-cyan-400" /> Próxima Facturación Estimada
                    </h4>
                    <div className={nextInvoiceCardClasses}>
                        <div>
                            <div className="text-sm text-zinc-400 mb-1">Fecha Próximo Pago</div>
                            <div className="text-lg font-semibold text-white">
                                {formatDate(facturacionData.proximaFechaPago)}
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-sm text-zinc-400 mb-1">Monto Estimado</div>
                            <div className="text-2xl font-bold text-emerald-400">
                                {formatCurrency(facturacionData.montoEstimadoProximaFactura)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección Historial de Facturas */}
                <div className={sectionClasses}>
                    <h4 className={sectionTitleClasses}>
                        <CircleDollarSign size={15} className="text-emerald-400" /> Historial de Facturas
                    </h4>
                    {facturacionData.historialFacturas.length === 0 ? (
                        <p className="text-sm text-zinc-500 italic text-center py-4">No hay facturas anteriores.</p>
                    ) : (
                        <div className={historyTableContainerClasses}>
                            <table className={tableClasses}>
                                <thead>
                                    <tr>
                                        <th className={thClasses}>Fecha Emisión</th>
                                        <th className={thClasses}>Periodo Cubierto</th>
                                        <th className={`${thClasses} text-right`}>Monto</th>
                                        <th className={thClasses}>Status</th>
                                        <th className={thClasses}></th> {/* Link Stripe */}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-700">
                                    {facturacionData.historialFacturas.map((factura) => {
                                        const statusInfo = getInvoiceStatusInfo(factura.status);
                                        // Construir URL de Stripe si tienes el ID
                                        const stripeInvoiceUrl = factura.stripeInvoiceId
                                            ? `https://dashboard.stripe.com/invoices/${factura.stripeInvoiceId}` // Ajusta si usas entorno de prueba
                                            : null;

                                        return (
                                            <tr key={factura.id}>
                                                <td className={tdClasses}>{formatDate(factura.fechaEmision)}</td>
                                                <td className={tdClasses}>{formatPeriod(factura.periodoInicio, factura.periodoFin)}</td>
                                                <td className={`${tdClasses} text-right font-medium`}>{formatCurrency(factura.montoTotal)}</td>
                                                <td className={tdClasses}>
                                                    <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                        <statusInfo.icon size={12} />
                                                        {statusInfo.text}
                                                    </span>
                                                </td>
                                                <td className={`${tdClasses} text-center`}>
                                                    {stripeInvoiceUrl && (
                                                        <a
                                                            href={stripeInvoiceUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-zinc-400 hover:text-blue-400 inline-block"
                                                            title="Ver factura en Stripe"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {/* Opcional: Botón para ver historial completo si se limita */}
                    {/* <div className="text-center mt-4">
                        <button className="text-xs text-blue-400 hover:underline">Ver historial completo</button>
                     </div> */}
                </div>
            </div>
        </div>
    );
}
