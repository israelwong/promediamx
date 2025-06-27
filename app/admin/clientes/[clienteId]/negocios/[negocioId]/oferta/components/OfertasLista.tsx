// Ruta: /admin/clientes/[clienteId]/negocios/[negocioId]/oferta/components/OfertasLista.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { obtenerOfertasNegocioAction } from '@/app/admin/_lib/actions/oferta/oferta.actions';
import { type OfertaParaListaType } from '@/app/admin/_lib/actions/oferta/oferta.schemas';

import { Button } from '@/app/components/ui/button';
import { Loader2, PlusIcon, CalendarDays, BadgeCheck, BadgeX, AlertTriangle, PencilIcon, Ticket, PackageSearch } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string;
}

export default function OfertasLista({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [ofertas, setOfertas] = useState<OfertaParaListaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const mainCardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg flex flex-col h-full";
    const headerCardClasses = "p-4 md:p-5 border-b border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sticky top-0 bg-zinc-800 z-10 rounded-t-xl";
    const titleCardClasses = "text-xl lg:text-2xl font-semibold text-zinc-100 flex items-center gap-2.5";
    const createButtonCardClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";

    // Clases para la cuadrícula y las tarjetas individuales
    const gridContainerClasses = "flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar";
    const gridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"; // 4 columnas en XL

    const cardClasses = "border border-zinc-700 rounded-lg bg-zinc-800/60 flex flex-col items-start hover:border-blue-600/60 hover:shadow-lg transition-all duration-150 cursor-pointer group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-800 h-full"; // h-full para tarjetas de igual altura si la fila lo permite
    const imageContainerClasses = "w-full h-40 rounded-t-md bg-zinc-700 relative overflow-hidden border-b border-zinc-600"; // Imagen arriba
    const contentContainerClasses = "p-4 flex-grow flex flex-col justify-between w-full"; // Contenido abajo, flex-grow para empujar footer

    const statusBadgeBaseClasses = "text-[0.7rem] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 leading-tight border";
    const editButtonClasses = "text-zinc-400 hover:text-blue-300 p-1.5 rounded-md hover:bg-zinc-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150";

    const emptyStateContainerClasses = "bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl p-8 py-12 text-center text-zinc-400 flex flex-col items-center";
    const errorBoxClasses = "p-3 rounded-md text-sm my-3 flex items-center gap-2 shadow bg-red-500/10 border border-red-500/30 text-red-400";

    const fetchOfertas = useCallback(async () => {
        if (!negocioId) {
            setError("ID de Negocio no proporcionado."); setLoading(false); return;
        }
        setLoading(true); setError(null);
        try {
            const result = await obtenerOfertasNegocioAction(negocioId);
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

    const getStatusInfo = (status: OfertaParaListaType['status'] | string | null | undefined): { text: string; colorClasses: string; icon: React.ElementType } => {
        switch (status?.toUpperCase()) {
            case 'ACTIVO': return { text: 'Activa', colorClasses: 'bg-green-500/20 text-green-300 border-green-500/30', icon: BadgeCheck };
            case 'INACTIVO': return { text: 'Inactiva', colorClasses: 'bg-zinc-600/30 text-zinc-400 border-zinc-600/50', icon: BadgeX };
            case 'BORRADOR': return { text: 'Borrador', colorClasses: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: PencilIcon };
            case 'PROGRAMADA': return { text: 'Programada', colorClasses: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CalendarDays };
            case 'FINALIZADA': return { text: 'Finalizada', colorClasses: 'bg-gray-600/20 text-gray-400 border-gray-600/40', icon: BadgeX };
            case 'BETA': return { text: 'Beta', colorClasses: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: BadgeCheck };
            case 'PROXIMAMENTE': return { text: 'Próximamente', colorClasses: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: CalendarDays };
            default:
                const statusString = typeof status === 'string' ? status : 'Desconocido';
                return { text: statusString.charAt(0).toUpperCase() + statusString.slice(1), colorClasses: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle };
        }
    };

    const formatDate = (dateInput: Date | string | null | undefined): string => {
        if (!dateInput) return 'N/A';
        try {
            const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
            if (isNaN(date.getTime())) return 'Fecha Inválida';
            return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        catch { return 'Fecha Inválida'; }
    };

    return (
        <div className={mainCardContainerClasses}>
            <div className={headerCardClasses}>
                <h1 className={titleCardClasses}>
                    <Ticket size={26} className="text-amber-400" /> Ofertas y Promociones
                </h1>
                <button onClick={handleNavigateToCreate} className={createButtonCardClasses} title="Crear nueva oferta">
                    <PlusIcon size={16} /> <span>Crear Nueva Oferta</span>
                </button>
            </div>

            {error && !loading && (
                <div className={`${errorBoxClasses} mx-4 md:mx-6`}>
                    <AlertTriangle size={18} /><span>{error}</span>
                    <Button onClick={() => fetchOfertas()} variant="outline" size="sm" className="ml-auto border-zinc-600 hover:bg-zinc-700 text-zinc-200">Reintentar</Button>
                </div>
            )}

            <div className={gridContainerClasses}> {/* Contenedor principal para la cuadrícula */}
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-400"> {/* Ocupa todas las columnas */}
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                        <span>Cargando ofertas...</span>
                    </div>
                ) : ofertas.length === 0 && !error ? (
                    <div className={`col-span-full ${emptyStateContainerClasses}`}> {/* Ocupa todas las columnas */}
                        <PackageSearch size={56} className="mx-auto mb-5 text-zinc-500" />
                        <p className="mb-2 text-xl font-semibold text-zinc-200">Aún no hay ofertas creadas</p>
                        <p className="mb-6 text-sm max-w-md">Crea ofertas y descuentos para atraer más clientes e impulsar tus ventas.</p>
                        <button onClick={handleNavigateToCreate} className={`${createButtonCardClasses} px-6 py-2.5 text-sm`}>
                            <PlusIcon size={18} /> Crear Primera Oferta
                        </button>
                    </div>
                ) : (
                    <div className={gridClasses}> {/* La cuadrícula real */}
                        {ofertas.map((oferta) => {
                            const statusInfo = getStatusInfo(oferta.status);
                            return (
                                <div // Cambiado de li a div, o podría ser <article>
                                    key={oferta.id}
                                    className={cardClasses} // Aplica estilos de tarjeta a cada item de la cuadrícula
                                    onClick={() => handleNavigateToEdit(oferta.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNavigateToEdit(oferta.id); }}
                                    role="button" // Para accesibilidad
                                    tabIndex={0} // Para que sea focusable
                                    aria-label={`Ver detalles de la oferta ${oferta.nombre}`}
                                >
                                    {oferta.imagenPortadaUrl ? (
                                        <div className={imageContainerClasses}>
                                            <Image
                                                src={oferta.imagenPortadaUrl}
                                                alt={`Imagen de ${oferta.nombre}`}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" // Ajustar sizes para grid
                                                className="object-cover"
                                                loading="lazy"
                                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x160/3f3f46/a1a1aa?text=Error'; }}
                                            />
                                        </div>
                                    ) : (
                                        <div className={`${imageContainerClasses} flex items-center justify-center text-zinc-500`}>
                                            <Ticket size={48} />
                                        </div>
                                    )}

                                    <div className={contentContainerClasses}>
                                        <div> {/* Contenedor para la parte superior del contenido */}
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <span className={`${statusBadgeBaseClasses} ${statusInfo.colorClasses}`}>
                                                    <statusInfo.icon size={11} className="mr-1" />{statusInfo.text}
                                                </span>
                                                {/* El botón de editar podría ser un ícono pequeño si se desea,
                                                    o eliminarse de la vista de lista y estar solo en la página de edición.
                                                    Por ahora lo mantenemos pero ajustamos para que no interfiera con el click principal.
                                                */}
                                                <button
                                                    className={editButtonClasses + " sm:opacity-100"} // Hacerlo visible o ajustar
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Evitar que el click navegue
                                                        handleNavigateToEdit(oferta.id);
                                                    }}
                                                    aria-label="Editar oferta"
                                                    title="Editar esta oferta"
                                                >
                                                    <PencilIcon size={14} />
                                                </button>
                                            </div>
                                            <h4 className="text-base font-semibold text-zinc-100 line-clamp-2 group-hover:text-blue-300 transition-colors" title={oferta.nombre || ''}>
                                                {oferta.nombre || <span className="italic text-zinc-500">Sin nombre</span>}
                                            </h4>
                                            {oferta.descripcion && (
                                                <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5" title={oferta.descripcion}>
                                                    {oferta.descripcion}
                                                </p>
                                            )}
                                        </div>

                                        {/* Footer del contenido de la tarjeta */}
                                        <div className='text-xs text-zinc-500 flex items-center gap-1.5 mt-auto pt-2'> {/* mt-auto para empujar al fondo */}
                                            <CalendarDays size={13} />
                                            <span>{formatDate(oferta.fechaInicio)}</span>
                                            <span className="text-zinc-600">-</span>
                                            <span>{formatDate(oferta.fechaFin)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
