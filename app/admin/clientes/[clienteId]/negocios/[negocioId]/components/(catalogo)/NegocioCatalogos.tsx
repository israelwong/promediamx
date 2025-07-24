'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// --- IMPORTACIONES ACTUALIZADAS ---
import { obtenerCatalogosPorNegocioId } from '@/app/admin/_lib/unused/catalogo.actions';
import { CatalogoParaLista } from '@/app/admin/_lib/unused/catalogo.actions'; // Usar el nuevo tipo
// ---------------------------------
import { Loader2, ListX, PlusIcon, ChevronRight, ShoppingBasket, LayoutGrid } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    clienteId?: string;
}

export default function NegocioCatalogos({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [catalogos, setCatalogos] = useState<CatalogoParaLista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "bg-zinc-800/0 flex flex-col h-full"; // Fondo transparente si es parte de otro panel
    const listContainerClasses = "flex-grow overflow-y-auto space-y-3"; // Contenedor de la lista
    const catalogoCardClasses = "flex items-start gap-3 w-full p-3 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 text-left";
    const imageContainerClasses = "w-16 h-16 rounded flex-shrink-0 bg-zinc-600 relative overflow-hidden";
    const contentContainerClasses = "flex-grow overflow-hidden";
    const statusBadgeBase = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold inline-flex items-center gap-1 leading-tight";
    const statusBadgeActive = "bg-green-500/20 text-green-400";
    const statusBadgeInactive = "bg-zinc-600/30 text-zinc-400";
    // --- NUEVA CLASE PARA BOTÓN CREAR INTERNO ---
    const crearButtonClasses = "w-full border-2 border-dashed border-zinc-600 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-lg p-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";

    // --- Carga de datos (sin cambios) ---
    const fetchCatalogos = useCallback(async () => {
        if (!negocioId) { setError("ID de Negocio no proporcionado."); setLoading(false); return; }
        setLoading(true); setError(null); setCatalogos([]);
        try {
            const catalogosData = await obtenerCatalogosPorNegocioId(negocioId);
            setCatalogos(catalogosData || []);
        } catch (err) {
            console.error("Error al obtener los catálogos:", err);
            setError("No se pudo cargar la información de catálogos.");
            setCatalogos([]);
        } finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchCatalogos(); }, [fetchCatalogos]);

    // --- Navegación (sin cambios) ---
    const handleCrearCatalogo = () => {
        const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        router.push(`${basePath}/catalogo/nuevo`);
    };
    const handleNavigateToCatalogo = (catalogoId: string) => {
        const basePath = clienteId ? `/admin/clientes/${clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        router.push(`${basePath}/catalogo/${catalogoId}`);
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* --- CABECERA ELIMINADA --- */}
            {/* <div className={headerClasses}> ... </div> */}

            {/* Contenido Principal */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 border border-red-500/50 rounded-md p-4"><ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>
                ) : (
                    // --- LISTA DE TARJETAS Y BOTÓN CREAR ---
                    <ul className="space-y-3">
                        {catalogos.map((cat) => {
                            const itemCount = cat._count?.ItemCatalogo ?? 0;
                            const isActive = cat.status === 'activo';
                            return (
                                <li key={cat.id}>
                                    <button
                                        onClick={() => handleNavigateToCatalogo(cat.id)}
                                        className={catalogoCardClasses}
                                        title={`Gestionar catálogo: ${cat.nombre || 'Sin nombre'}`}
                                    >
                                        {/* Columna Imagen */}
                                        <div className={imageContainerClasses}>
                                            {cat.imagenPortadaUrl ? (
                                                <Image
                                                    src={cat.imagenPortadaUrl}
                                                    alt={`Portada de ${cat.nombre || 'catálogo'}`}
                                                    fill sizes="64px" className="object-cover" loading="lazy"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-zinc-500"><LayoutGrid size={24} /></div>
                                            )}
                                        </div>
                                        {/* Columna Contenido */}
                                        <div className={contentContainerClasses}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className='font-medium text-sm text-zinc-100 truncate mr-2'>{cat.nombre || <span className='italic text-zinc-400'>Sin Nombre</span>}</h4>
                                                <span className={`${statusBadgeBase} ${isActive ? statusBadgeActive : statusBadgeInactive}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                                            </div>
                                            {cat.descripcion && (<p className='text-xs text-zinc-400 mt-0.5 line-clamp-1'>{cat.descripcion}</p>)}
                                            <p className={`text-xs mt-1 ${isActive ? 'text-green-400' : 'text-gray-400'} flex items-center gap-1`}><ShoppingBasket size={12} /> {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}</p>
                                        </div>
                                        {/* Icono Navegación */}
                                        <div className="flex-shrink-0 text-zinc-500 self-center"><ChevronRight size={18} /></div>
                                    </button>
                                </li>
                            );
                        })}
                        {/* --- NUEVO: Botón Crear Catálogo Apilado --- */}
                        <li>
                            <button
                                onClick={handleCrearCatalogo}
                                className={crearButtonClasses}
                                title="Crear un nuevo catálogo"
                            >
                                <PlusIcon size={16} />
                                <span>Crear Catálogo</span>
                            </button>
                        </li>
                        {/* --------------------------------------- */}
                    </ul>
                )}
            </div>
        </div>
    );
}
