'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// Asegúrate que la ruta a tus actions sea correcta
import { obtenerCatalogosPorNegocioId } from '@/app/admin/_lib/catalogo.actions';
// Asegúrate que la ruta a tus types sea correcta y que Catalogo incluya _count
import { Catalogo as CatalogoType } from '@/app/admin/_lib/types';
import { Loader2, ListX, Info, PackagePlus, Package, ChevronRight, ShoppingBasket, LayoutGrid } from 'lucide-react'; // Iconos añadidos

// Interfaz actualizada para incluir _count (si usas tipos separados)
// Si usas tipos generados por Prisma, asegúrate que la query lo incluya.
interface CatalogoConConteo extends CatalogoType {
    _count?: {
        ItemCatalogo: number;
    };
    // Incluir ItemCatalogo solo si realmente necesitas la lista aquí,
    // de lo contrario, es mejor quitarlo para eficiencia si solo usas _count.
    // ItemCatalogo?: any[]; // O el tipo correcto si lo incluyes
}

interface Props {
    negocioId: string;
}

export default function NegocioCatalogos({ negocioId }: Props) {
    const router = useRouter();
    // Usar la interfaz actualizada
    const [catalogos, setCatalogos] = useState<CatalogoConConteo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col h-full";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    // Estilo para la tarjeta del catálogo
    const catalogoCardClasses = "block w-full p-4 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600 rounded-lg shadow-sm transition-all duration-150 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";
    const statusBadgeBase = "px-2 py-0.5 rounded-full text-xs font-medium";
    const statusBadgeActive = "bg-green-600 text-green-100";
    const statusBadgeInactive = "bg-gray-600 text-gray-100";

    useEffect(() => {
        if (!negocioId) {
            setError("ID de Negocio no proporcionado.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setCatalogos([]); // Limpiar catálogos previos

        const fetchCatalogos = async () => {
            try {
                // Esta función AHORA debe devolver los catálogos con _count
                const catalogosData = await obtenerCatalogosPorNegocioId(negocioId);
                setCatalogos(catalogosData || []); // Asegurar que sea un array
            } catch (err) {
                console.error("Error al obtener los catálogos:", err);
                setError("No se pudo cargar la información de catálogos.");
                setCatalogos([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCatalogos();
    }, [negocioId]);

    const handleCrearCatalogo = () => {
        router.push(`/admin/negocios/${negocioId}/catalogo/nuevo`);
    };

    const handleNavigateToCatalogo = (catalogoId: string) => {
        router.push(`/admin/negocios/${negocioId}/catalogo/${catalogoId}`);
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera del Panel */}
            <div className='flex items-center justify-between mb-4 border-b border-zinc-700 pb-2 gap-2'>
                <h2 className='text-lg font-semibold text-white flex items-center gap-2'>
                    <Package size={18} /> Catálogos
                </h2>
                {/* Botón Crear siempre visible si no está cargando/error */}
                {!loading && !error && (
                    <button
                        onClick={handleCrearCatalogo}
                        className={buttonPrimaryClasses}
                        title="Crear un nuevo catálogo para este negocio"
                    >
                        <PackagePlus size={16} />
                        <span>Crear</span> {/* Texto más corto */}
                    </button>
                )}
            </div>

            {/* Contenido Principal */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-3"> {/* Reducir space-y */}
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando catálogos...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 border border-red-500/50 rounded-md p-4">
                        <ListX className="h-8 w-8 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p>
                    </div>
                ) : catalogos.length === 0 ? (
                    // Mensaje si no hay catálogos creados
                    <div className="text-center py-6">
                        <Info className="h-8 w-8 text-zinc-500 mb-3 mx-auto" />
                        <p className='text-zinc-400 text-sm mb-3'>Este negocio aún no tiene catálogos.</p>
                        <button
                            onClick={handleCrearCatalogo}
                            className={`${buttonPrimaryClasses} !w-auto mx-auto`} // Botón centrado
                            title="Crear el primer catálogo"
                        >
                            <PackagePlus size={16} />
                            <span>Crear Primer Catálogo</span>
                        </button>
                    </div>
                ) : (
                    // Listar cada catálogo como una tarjeta clickeable
                    <div className="space-y-3">
                        {catalogos.map((cat) => {
                            // **Uso de _count para obtener la cantidad de ítems**
                            const itemCount = cat._count?.ItemCatalogo ?? 0;
                            const isActive = cat.status === 'activo';

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleNavigateToCatalogo(cat.id)}
                                    className={catalogoCardClasses}
                                    title={`Gestionar catálogo: ${cat.nombre || 'Sin nombre'}`}
                                >
                                    <div className="flex justify-between items-start gap-2 text-start">
                                        {/* Contenido Principal */}
                                        <div className="flex-grow overflow-hidden">
                                            {/* Nombre del Catálogo */}
                                            <h4 className='font-medium text-md text-zinc-100 truncate flex items-center gap-2'>
                                                <LayoutGrid size={14} />
                                                {cat.nombre || <span className='italic text-zinc-400'>Catálogo Sin Nombre</span>}
                                            </h4>
                                            {/* Descripción (opcional y truncada) */}
                                            {cat.descripcion && (
                                                <p className='text-sm text-zinc-400 mt-1 line-clamp-1'>
                                                    {cat.descripcion}
                                                </p>
                                            )}
                                            {/* Contador de Ítems y Status */}
                                            <div className='flex items-center gap-3 mt-2'>
                                                <span className={`text-sm ${isActive ? 'text-green-400' : 'text-gray-400'} flex items-center gap-1`}>
                                                    <ShoppingBasket size={14} />
                                                    {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                                                </span>
                                                <span className={`${statusBadgeBase} ${isActive ? statusBadgeActive : statusBadgeInactive}`}>
                                                    {isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Icono de Navegación */}
                                        <div className="flex-shrink-0 text-zinc-500">
                                            <ChevronRight size={20} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}