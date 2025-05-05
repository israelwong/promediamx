'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- IMPORTACIONES DE ACCIONES Y TIPOS ---
import { obtenerOfertasNegocio } from '@/app/admin/_lib/oferta.actions'; // Importa la nueva acción
import { OfertaParaLista } from '@/app/admin/_lib/oferta.actions'; // Importa el nuevo tipo
import { Loader2, ListChecks, PlusIcon, CalendarDays, BadgeCheck, BadgeX, AlertTriangle, PencilIcon, Ticket, Percent } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    clienteId?: string; // Para navegación
}

export default function NegocioOfertas({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [ofertas, setOfertas] = useState<OfertaParaLista[]>([]); // Usar el nuevo tipo
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind (similares a NegocioPromociones)
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const cardClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start gap-3 hover:bg-zinc-800/50 transition-colors duration-150 cursor-pointer group";
    const imageContainerClasses = "w-16 h-16 rounded flex-shrink-0 bg-zinc-700 relative overflow-hidden";
    const contentContainerClasses = "flex-grow overflow-hidden";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const statusBadgeClasses = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold inline-flex items-center gap-1 leading-tight";
    const editButtonClasses = "text-zinc-500 hover:text-blue-400 p-1 rounded-md hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0";
    const codeBadgeClasses = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-mono bg-indigo-800/50 text-indigo-300"; // Estilo para código

    // --- Carga de datos ---
    const fetchOfertas = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerOfertasNegocio(negocioId);
            setOfertas(data || []);
        } catch (err) {
            console.error("Error al obtener las ofertas:", err);
            setError("No se pudieron cargar las ofertas.");
            setOfertas([]);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchOfertas();
    }, [fetchOfertas]);

    // --- Navegación ---
    const handleNavigateToCreate = () => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
        router.push(`${basePath}/oferta/nueva`); // Ajusta la ruta si es diferente
    };

    const handleNavigateToEdit = (ofertaId: string) => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
        router.push(`${basePath}/oferta/${ofertaId}`); // Ajusta la ruta si es diferente
    };

    // --- Helpers ---
    const getStatusInfo = (status: OfertaParaLista['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activa', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactiva', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            case 'programada': return { text: 'Programada', color: 'bg-blue-500/20 text-blue-400', icon: CalendarDays };
            case 'finalizada': return { text: 'Finalizada', color: 'bg-gray-500/20 text-gray-400', icon: BadgeX };
            default: return { text: status || 'Desc.', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Inválida'; }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Ticket size={16} /> Ofertas y Descuentos {/* Título actualizado */}
                </h3>
                <button onClick={handleNavigateToCreate} className={buttonPrimaryClasses} title="Crear nueva oferta">
                    <PlusIcon size={14} /> <span>Crear Oferta</span>
                </button>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando ofertas...</span></div>
                ) : ofertas.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay ofertas definidas.</p></div>
                ) : (
                    // Lista de Ofertas como Tarjetas
                    <ul className='space-y-2'>
                        {ofertas.map((oferta) => {
                            const statusInfo = getStatusInfo(oferta.status);
                            const hasCode = !!oferta.codigo;
                            return (
                                <li key={oferta.id} className={cardClasses} onClick={() => handleNavigateToEdit(oferta.id)}>
                                    {/* Columna Imagen */}
                                    <div className={imageContainerClasses}>
                                        {oferta.imagenPortadaUrl ? (
                                            <Image
                                                src={oferta.imagenPortadaUrl}
                                                alt={`Imagen de ${oferta.nombre}`}
                                                fill
                                                sizes="64px"
                                                className="object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-500">
                                                {/* Icono según tipo de oferta */}
                                                {oferta.tipoOferta?.includes('DESCUENTO') ? <Percent size={24} /> : <Ticket size={24} />}
                                            </div>
                                        )}
                                    </div>

                                    {/* Columna Contenido */}
                                    <div className={contentContainerClasses}>
                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap"> {/* flex-wrap para códigos largos */}
                                            <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                <statusInfo.icon size={10} />{statusInfo.text}
                                            </span>
                                            <p className="text-sm font-medium text-zinc-200 truncate" title={oferta.nombre || ''}>
                                                {oferta.nombre}
                                            </p>
                                            {/* Mostrar código si existe */}
                                            {hasCode && (
                                                <span className={codeBadgeClasses} title={`Código: ${oferta.codigo}`}>
                                                    #{oferta.codigo}
                                                </span>
                                            )}
                                        </div>
                                        {oferta.descripcion && (
                                            <p className="text-xs text-zinc-400 line-clamp-1 mb-1" title={oferta.descripcion}>
                                                {oferta.descripcion}
                                            </p>
                                        )}
                                        <div className='text-xs text-zinc-500 flex items-center gap-1'>
                                            <CalendarDays size={12} />
                                            <span>{formatDate(oferta.fechaInicio)}</span>
                                            <span>-</span>
                                            <span>{formatDate(oferta.fechaFin)}</span>
                                        </div>
                                    </div>

                                    {/* Botón Editar (aparece al hover) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleNavigateToEdit(oferta.id); }}
                                        className={editButtonClasses}
                                        title="Editar Oferta"
                                    >
                                        <PencilIcon size={14} />
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
