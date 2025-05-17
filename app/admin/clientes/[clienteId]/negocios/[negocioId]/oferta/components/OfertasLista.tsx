// Ruta: /admin/clientes/[clienteId]/negocios/[negocioId]/oferta/components/OfertasLista.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { obtenerOfertasNegocio } from '@/app/admin/_lib/actions/oferta/oferta.actions';
import { type OfertaParaListaType } from '@/app/admin/_lib/actions/oferta/oferta.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

import { Button } from '@/app/components/ui/button';

import { Loader2, PlusIcon, CalendarDays, BadgeCheck, BadgeX, AlertTriangle, PencilIcon, Ticket, Percent, PackageSearch } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string; // clienteId es necesario para la navegación
}

export default function OfertasLista({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [ofertas, setOfertas] = useState<OfertaParaListaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind mejoradas
    const mainCardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg flex flex-col h-full";
    const headerCardClasses = "p-4 md:p-5 border-b border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sticky top-0 bg-zinc-800 z-10 rounded-t-xl";
    const titleCardClasses = "text-xl lg:text-2xl font-semibold text-zinc-100 flex items-center gap-2.5";
    const createButtonCardClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";

    const listContainerClasses = "flex-grow overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar"; // Espaciado entre tarjetas
    const cardClasses = "border border-zinc-700 rounded-lg p-4 bg-zinc-800/60 flex flex-col sm:flex-row items-start gap-4 hover:border-blue-600/60 hover:shadow-lg transition-all duration-150 cursor-pointer group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-800";
    const imageContainerClasses = "w-full sm:w-20 h-32 sm:h-20 rounded-md flex-shrink-0 bg-zinc-700 relative overflow-hidden border border-zinc-600";
    const contentContainerClasses = "flex-grow overflow-hidden";

    const statusBadgeBaseClasses = "text-[0.7rem] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 leading-tight border";
    const codeBadgeClasses = "text-[0.7rem] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30";
    const editButtonClasses = "text-zinc-400 hover:text-blue-300 p-1.5 rounded-md hover:bg-zinc-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 flex-shrink-0 absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto";

    const emptyStateContainerClasses = "bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl p-8 py-12 text-center text-zinc-400 flex flex-col items-center";
    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-3 flex items-center gap-2 shadow"; // Para errores de carga
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;


    const fetchOfertas = useCallback(async () => {
        if (!negocioId) {
            setError("ID de Negocio no proporcionado."); setLoading(false); return;
        }
        setLoading(true); setError(null);
        try {
            const result = await obtenerOfertasNegocio(negocioId);
            if (result.success && result.data) {
                setOfertas(result.data);
            } else {
                setError(result.error || "No se pudieron cargar las ofertas.");
                setOfertas([]);
            }
        } catch (err) {
            console.error("Error al obtener las ofertas:", err);
            setError("Ocurrió un error inesperado al cargar las ofertas.");
            setOfertas([]);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => { fetchOfertas(); }, [fetchOfertas]);

    const handleNavigateToCreate = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/nueva`);
    };
    const handleNavigateToEdit = (ofertaId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`);
    };

    const getStatusInfo = (status: OfertaParaListaType['status']): { text: string; colorClasses: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activa', colorClasses: 'bg-green-500/20 text-green-300 border-green-500/30', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactiva', colorClasses: 'bg-zinc-600/30 text-zinc-400 border-zinc-600/50', icon: BadgeX };
            case 'programada': return { text: 'Programada', colorClasses: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CalendarDays };
            case 'finalizada': return { text: 'Finalizada', colorClasses: 'bg-gray-600/20 text-gray-400 border-gray-600/40', icon: BadgeX };
            default: return { text: status || 'Desconocido', colorClasses: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle };
        }
    };
    const formatDate = (dateInput: Date | string | null | undefined): string => {
        if (!dateInput) return 'N/A';
        try { const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput; return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Fecha Inválida'; }
    };

    return (
        <div className={mainCardContainerClasses}>
            <div className={headerCardClasses}>
                <h1 className={titleCardClasses}>
                    <Ticket size={22} className="text-amber-400" /> Ofertas y Descuentos
                </h1>
                <button onClick={handleNavigateToCreate} className={createButtonCardClasses} title="Crear nueva oferta">
                    <PlusIcon size={16} /> <span>Crear Nueva Oferta</span>
                </button>
            </div>

            {error && ofertas.length === 0 && ( // Mostrar error solo si no hay ofertas cargadas
                <div className={`${errorBoxClasses} mx-4 md:mx-6`}>
                    <AlertTriangle size={18} /><span>{error}</span>
                    <Button onClick={fetchOfertas} variant="outline" size="sm" className="ml-auto border-zinc-600 hover:bg-zinc-700 text-zinc-200">Reintentar</Button>
                </div>
            )}

            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                        <span>Cargando ofertas...</span>
                    </div>
                ) : ofertas.length === 0 && !error ? (
                    <div className={emptyStateContainerClasses}>
                        <PackageSearch size={56} className="mx-auto mb-5 text-zinc-500" />
                        <p className="mb-2 text-xl font-semibold text-zinc-200">Aún no hay ofertas creadas</p>
                        <p className="mb-6 text-sm max-w-md">Crea ofertas y descuentos para atraer más clientes e impulsar tus ventas.</p>
                        <button onClick={handleNavigateToCreate} className={createButtonCardClasses + " px-6 py-2.5 text-sm"}>
                            <PlusIcon size={18} /> Crear Primera Oferta
                        </button>
                    </div>
                ) : (
                    <ul className='space-y-3'>
                        {ofertas.map((oferta) => {
                            const statusInfo = getStatusInfo(oferta.status);
                            const hasCode = !!oferta.codigo;
                            return (
                                <li key={oferta.id}>
                                    <button // Convertido a button para mejor accesibilidad y focus
                                        type="button"
                                        className={cardClasses}
                                        onClick={() => handleNavigateToEdit(oferta.id)}
                                        aria-label={`Editar oferta ${oferta.nombre}`}
                                    >
                                        <div className={imageContainerClasses}>
                                            {oferta.imagenPortadaUrl ? (
                                                <Image
                                                    src={oferta.imagenPortadaUrl}
                                                    alt={`Imagen de ${oferta.nombre}`}
                                                    fill sizes="80px" className="object-cover" loading="lazy"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x128/52525b/a1a1aa?text=Img'; }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-zinc-400">
                                                    {oferta.tipoOferta?.includes('DESCUENTO') ? <Percent size={30} /> : <Ticket size={30} />}
                                                </div>
                                            )}
                                        </div>

                                        <div className={contentContainerClasses}>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`${statusBadgeBaseClasses} ${statusInfo.colorClasses}`}>
                                                    <statusInfo.icon size={11} />{statusInfo.text}
                                                </span>
                                                {hasCode && (
                                                    <span className={codeBadgeClasses} title={`Código: ${oferta.codigo}`}>
                                                        #{oferta.codigo}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-base font-semibold text-zinc-100 truncate group-hover:text-blue-300 transition-colors" title={oferta.nombre || ''}>
                                                {oferta.nombre || <span className="italic text-zinc-500">Sin nombre</span>}
                                            </h4>
                                            {oferta.descripcion && (
                                                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5" title={oferta.descripcion}>
                                                    {oferta.descripcion}
                                                </p>
                                            )}
                                            <div className='text-xs text-zinc-500 flex items-center gap-1.5 mt-1.5'>
                                                <CalendarDays size={13} />
                                                <span>{formatDate(oferta.fechaInicio)}</span>
                                                <span>-</span>
                                                <span>{formatDate(oferta.fechaFin)}</span>
                                            </div>
                                        </div>
                                        <div className={editButtonClasses}>
                                            <PencilIcon size={16} />
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
