// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/components/CatalogoLista.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Actions y tipos Zod desde nuevas ubicaciones
import { obtenerCatalogosPorNegocioId } from '@/app/admin/_lib/actions/catalogo/catalogo.actions';
import { type CatalogoParaListaType } from '@/app/admin/_lib/actions/catalogo/catalogo.schemas';
// ActionResult se importa globalmente si es necesario para manejar errores de forma más granular
// import { ActionResult } from '@/app/admin/_lib/types';


import { Loader2, PlusIcon, ChevronRight, ShoppingBasket, LayoutGrid, BookOpenText, AlertCircle } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string; // clienteId es necesario para la navegación
}

export default function CatalogoLista({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [catalogos, setCatalogos] = useState<CatalogoParaListaType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases Tailwind
    // Contenedor principal tipo card
    const mainCardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerCardClasses = "p-4 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-800 z-10";
    const titleCardClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const createButtonCardClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";

    const listContainerClasses = "flex-grow overflow-y-auto p-4 space-y-3"; // Añadido p-4
    const catalogoCardClasses = "flex items-start gap-4 w-full p-4 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 text-left";
    const imageContainerClasses = "w-20 h-20 rounded-md flex-shrink-0 bg-zinc-600 relative overflow-hidden"; // Ligeramente más grande y rounded-md
    const contentContainerClasses = "flex-grow overflow-hidden py-1"; // Padding vertical para alinear mejor
    const statusBadgeBase = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold inline-flex items-center gap-1 leading-tight";
    const statusBadgeActive = "bg-green-500/20 text-green-400";
    const statusBadgeInactive = "bg-zinc-600/30 text-zinc-400";
    const emptyStateContainerClasses = "flex flex-col items-center justify-center text-center py-10 px-4 h-full";


    const fetchCatalogos = useCallback(async () => {
        if (!negocioId) { setError("ID de Negocio no proporcionado."); setLoading(false); return; }
        setLoading(true); setError(null); setCatalogos([]);
        try {
            const result = await obtenerCatalogosPorNegocioId(negocioId);
            if (result.success && result.data) {
                setCatalogos(result.data);
            } else {
                setError(result.error || "No se pudo cargar la información de catálogos.");
                setCatalogos([]);
            }
        } catch (err) {
            console.error("Error al obtener los catálogos:", err);
            setError("Ocurrió un error inesperado al cargar los catálogos.");
            setCatalogos([]);
        } finally { setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchCatalogos(); }, [fetchCatalogos]);

    const handleCrearCatalogo = () => {
        // clienteId ya está disponible como prop
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/nuevo`);
    };
    const handleNavigateToCatalogo = (catalogoId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`);
    };

    return (
        <div className={mainCardContainerClasses}>
            <div className={headerCardClasses}>
                <h2 className={titleCardClasses}>
                    <BookOpenText size={20} className="text-sky-400" /> {/* Icono para Catálogos */}
                    Mis Catálogos
                </h2>
                <button
                    onClick={handleCrearCatalogo}
                    className={createButtonCardClasses}
                    title="Crear un nuevo catálogo"
                    disabled={loading}
                >
                    <PlusIcon size={16} />
                    <span>Nuevo Catálogo</span>
                </button>
            </div>

            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400 text-center"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando catálogos...</span></div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 border border-red-500/30 bg-red-500/5 rounded-md p-6">
                        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                        <p className="text-red-400 text-base font-medium mb-1">Error al Cargar</p>
                        <p className="text-zinc-400 text-sm">{error}</p>
                        <button
                            onClick={() => fetchCatalogos()}
                            className="mt-4 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : catalogos.length === 0 ? (
                    <div className={emptyStateContainerClasses}>
                        <LayoutGrid className="h-12 w-12 text-zinc-500 mb-4" />
                        <p className='text-zinc-300 text-lg font-medium mb-2'>No hay catálogos creados aún.</p>
                        <p className='text-zinc-400 text-sm mb-6 max-w-xs'>Empieza por crear tu primer catálogo para organizar tus productos o servicios.</p>
                        <button
                            onClick={handleCrearCatalogo}
                            className={createButtonCardClasses}
                            title="Crear un nuevo catálogo"
                        >
                            <PlusIcon size={16} />
                            <span>Crear Primer Catálogo</span>
                        </button>
                    </div>
                ) : (
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
                                        <div className={imageContainerClasses}>
                                            {cat.imagenPortadaUrl ? (
                                                <Image
                                                    src={cat.imagenPortadaUrl}
                                                    alt={`Portada de ${cat.nombre || 'catálogo'}`}
                                                    fill sizes="80px" className="object-cover" loading="lazy"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/80x80/404040/9ca3af?text=Error'; }}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-zinc-400"><LayoutGrid size={32} /></div>
                                            )}
                                        </div>
                                        <div className={contentContainerClasses}>
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className='font-semibold text-base text-zinc-100 truncate mr-2'>{cat.nombre || <span className='italic text-zinc-400'>Sin Nombre</span>}</h4>
                                                <span className={`${statusBadgeBase} ${isActive ? statusBadgeActive : statusBadgeInactive}`}>{isActive ? 'Activo' : 'Inactivo'}</span>
                                            </div>
                                            {cat.descripcion && (<p className='text-sm text-zinc-400 mt-0.5 line-clamp-2'>{cat.descripcion}</p>)}
                                            <p className={`text-xs mt-1.5 ${isActive ? 'text-green-400' : 'text-zinc-500'} flex items-center gap-1.5`}>
                                                <ShoppingBasket size={13} />
                                                <span>{itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}</span>
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 text-zinc-500 self-center ml-2 group-hover:text-blue-400 transition-colors">
                                            <ChevronRight size={20} />
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                        {/* El botón de crear ahora está en la cabecera */}
                    </ul>
                )}
            </div>
        </div>
    );
}
