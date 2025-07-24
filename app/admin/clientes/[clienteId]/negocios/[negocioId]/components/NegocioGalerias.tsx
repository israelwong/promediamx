'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- Actions and Types ---
import { obtenerGaleriasNegocioConPortada } from '@/app/admin/_lib/unused/galeriaNegocio.actions'; // Ajusta la ruta
import { GaleriaNegocioParaLista } from '@/app/admin/_lib/unused/galeriaNegocio.actions'; // Ajusta la ruta
// --- Icons ---
import { Loader2, ListX, Info, PlusIcon, ChevronRight, Image as ImageIcon, BadgeCheck, BadgeX, AlertTriangle, LayoutGrid } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId?: string; // Para navegación
}

export default function NegocioGaleriasLista({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [galerias, setGalerias] = useState<GaleriaNegocioParaLista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    // --- AJUSTE: Añadido padding y fondo zinc-800 ---
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    // --- NUEVO: Clases para la cabecera ---
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-700 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto space-y-3 pr-1";
    const cardClasses = "flex items-start gap-3 w-full p-3 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 text-left";
    const imageContainerClasses = "w-16 h-16 md:w-20 md:h-20 rounded flex-shrink-0 bg-zinc-600 relative overflow-hidden";
    const contentContainerClasses = "flex-grow overflow-hidden";
    const statusBadgeBase = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold inline-flex items-center gap-1 leading-tight";
    const statusBadgeActive = "bg-green-500/20 text-green-400";
    const statusBadgeInactive = "bg-zinc-600/30 text-zinc-400";
    // --- Clase para el botón Crear en la cabecera ---
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // const crearButtonClasses = "..."; // Clase eliminada, ya no se usa el botón inferior

    // --- Carga de datos (sin cambios) ---
    const fetchGalerias = useCallback(async () => {
        if (!negocioId) { setError("ID de Negocio no proporcionado."); setLoading(false); return; }
        setLoading(true); setError(null); setGalerias([]);
        try {
            const data = await obtenerGaleriasNegocioConPortada(negocioId);
            const galeriasConOrden: GaleriaNegocioParaLista[] = (data || []).map((gal: GaleriaNegocioParaLista, index: number) => ({ ...gal, orden: gal.orden ?? index }));
            setGalerias(galeriasConOrden);
        } catch (err) {
            console.error("Error al obtener las galerías:", err);
            setError("No se pudo cargar la información de galerías.");
            setGalerias([]);
        } finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchGalerias(); }, [fetchGalerias]);

    // --- Navegación (sin cambios) ---
    const handleCrearGaleria = () => {
        const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        router.push(`${basePath}/galeria/nueva`);
    };

    const handleNavigateToGaleria = (galeriaId: string) => {
        const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        router.push(`${basePath}/galeria/${galeriaId}/editar`);
    };

    // --- Helpers (sin cambios) ---
    const getStatusInfo = (status: GaleriaNegocioParaLista['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activa', color: statusBadgeActive, icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactiva', color: statusBadgeInactive, icon: BadgeX };
            default: return { text: status || 'Desc.', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>

            <div className={headerClasses}>
                <h2 className='text-base font-semibold text-white flex items-center gap-2'>
                    <LayoutGrid size={16} /> Galerías del Negocio {/* Icono LayoutGrid */}
                </h2>
                {/* Mostrar botón solo si no está cargando y no hay error */}
                {!loading && !error && (
                    <button onClick={handleCrearGaleria} className={buttonPrimaryClasses} title="Crear nueva galería">
                        <PlusIcon size={14} /> <span>Crear Galería</span>
                    </button>
                )}
            </div>
            {/* -------------------- */}

            {/* Contenido Principal */}
            <div className={listContainerClasses}>
                {loading ? (
                    // --- AJUSTE: Añadido fondo al loading ---
                    <div className="flex items-center justify-center py-10 text-zinc-400 bg-zinc-800 rounded-b-lg">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando galerías...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 border border-red-500/50 rounded-md p-4"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : galerias.length === 0 ? (
                    // --- AJUSTE: Mostrar botón crear aquí si la lista está vacía ---
                    <div className="text-center py-6">
                        <Info className="h-8 w-8 text-zinc-500 mb-3 mx-auto" />
                        <p className='text-zinc-400 text-sm mb-3'>Este negocio aún no tiene galerías de imágenes generales.</p>
                        <button
                            onClick={handleCrearGaleria}
                            className={`${buttonPrimaryClasses} !text-sm !px-4 !py-1.5 !w-auto mx-auto`} // Estilo un poco más grande
                            title="Crear la primera galería"
                        >
                            <PlusIcon size={16} />
                            <span>Crear Primera Galería</span>
                        </button>
                    </div>
                ) : (
                    // Lista de Galerías como Tarjetas
                    <ul className="space-y-3">
                        {galerias.map((gal) => {
                            const imageCount = gal._count?.imagenes ?? 0;
                            const statusInfo = getStatusInfo(gal.status);
                            return (
                                <li key={gal.id}>
                                    <button
                                        onClick={() => handleNavigateToGaleria(gal.id)}
                                        className={cardClasses}
                                        title={`Gestionar galería: ${gal.nombre || 'Sin nombre'}`}
                                    >
                                        {/* Columna Imagen */}
                                        <div className={imageContainerClasses}>
                                            {gal.imagenPortadaUrl ? (
                                                <Image src={gal.imagenPortadaUrl} alt={`Portada de ${gal.nombre || 'galería'}`} fill sizes="(max-width: 768px) 64px, 80px" className="object-cover" loading="lazy" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-zinc-500"><LayoutGrid size={24} /></div>
                                            )}
                                        </div>
                                        {/* Columna Contenido */}
                                        <div className={contentContainerClasses}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className='font-medium text-sm text-zinc-100 truncate mr-2'>{gal.nombre || <span className='italic text-zinc-400'>Sin Nombre</span>}</h4>
                                                <span className={`${statusBadgeBase} ${statusInfo.color}`}><statusInfo.icon size={10} />{statusInfo.text}</span>
                                            </div>
                                            {gal.descripcion && (<p className='text-xs text-zinc-400 mt-0.5 line-clamp-1' title={gal.descripcion}>{gal.descripcion}</p>)}
                                            <p className={`text-xs mt-1 text-zinc-400 flex items-center gap-1`}><ImageIcon size={12} /> {imageCount} {imageCount === 1 ? 'imagen' : 'imágenes'}</p>
                                        </div>
                                        {/* Icono Navegación */}
                                        <div className="flex-shrink-0 text-zinc-500 self-center"><ChevronRight size={18} /></div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* --- BOTÓN CREAR APILADO ELIMINADO --- */}
            {/* {!loading && !error && ( <div className="mt-auto pt-3 flex-shrink-0"> ... </div> )} */}
        </div>
    );
}

