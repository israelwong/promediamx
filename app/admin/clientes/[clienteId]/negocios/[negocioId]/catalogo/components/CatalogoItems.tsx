'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
// --- DnD Imports ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';

import {
    arrayMove,
    SortableContext,
    rectSortingStrategy, // Estrategia para grid
    useSortable,
    sortableKeyboardCoordinates
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

// --- Lucide Icons ---
import {
    Loader2, GripVertical, Package, Tag, Image as ImageIcon, Video, Link as LinkIcon,
    Users, Search, Filter, Box, Plus
} from 'lucide-react';
// --- Actions and Types ---
import { obtenerItemsParaCatalogo, actualizarOrdenItemsCatalogo } from '@/app/admin/_lib/itemCatalogo.actions'; // Asume que estas acciones existen
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions'; // Para filtro
import { ItemCatalogo, NegocioCategoria, NegocioEtiqueta } from '@/app/admin/_lib/types'; // Tipos base

// --- Tipo específico para la tarjeta/grid ---
type ItemParaGridCatalogo = Pick<
    ItemCatalogo,
    'id' | 'nombre' | 'descripcion' | 'tipoItem' | 'stock' | 'stockMinimo' |
    'esPromocionado' | 'AquienVaDirigido' | 'palabrasClave' | 'videoUrl' | 'linkPago' | 'status' | 'orden' | 'categoriaId'
> & {
    imagenPortadaUrl?: string | null;
    categoria?: Pick<NegocioCategoria, 'id' | 'nombre'> | null;
    itemEtiquetas?: { etiqueta: Pick<NegocioEtiqueta, 'id' | 'nombre'> }[];
    _count?: {
        galeria?: number;
        ItemCatalogoPromocion?: number;
        ItemCatalogoDescuento?: number;
    };
    // Campos calculados
    tienePublicoObjetivo?: boolean;
    tienePalabrasClave?: boolean;
    tieneVideo?: boolean;
    tieneLinkPago?: boolean;
    enPromocionActiva?: boolean;
    conDescuentoActivo?: boolean;
};

// Tipo para datos de ordenamiento
interface ItemOrdenData {
    id: string;
    orden: number;
}

interface Props {
    catalogoId: string;
    negocioId: string;
    clienteId?: string;
}

// --- Componente Tarjeta Arrastrable (Sin cambios) ---
function SortableItemCard({ item, navigateToEdit }: { item: ItemParaGridCatalogo; navigateToEdit: (id: string) => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    // Clases comunes
    const cardClasses = "bg-zinc-800 rounded-lg shadow-md overflow-hidden border border-zinc-700 flex flex-col h-full group cursor-pointer hover:border-blue-600/50 transition-colors duration-150";
    const imageContainerClasses = "relative aspect-video w-full bg-zinc-700"; // Aspect ratio para imagen
    const contentClasses = "p-3 flex flex-col flex-grow";
    const titleClasses = "text-sm font-semibold text-zinc-100 mb-1 line-clamp-1";
    const descriptionClasses = "text-xs text-zinc-400 mb-2 line-clamp-2 flex-grow";
    const tagClasses = "text-[0.65rem] bg-zinc-600 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";
    const indicatorContainerClasses = "flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 border-t border-zinc-700 pt-2";
    const indicatorIconClasses = "text-zinc-500"; // Gris por defecto
    const indicatorActiveIconClasses = "text-blue-400"; // Color si está activo/definido

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${cardClasses} ${isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
            onClick={() => navigateToEdit(item.id)}
            title={`Editar: ${item.nombre}`}
        >
            {/* Imagen de Portada */}
            <div className={imageContainerClasses}>
                {item.imagenPortadaUrl ? (
                    <Image
                        src={item.imagenPortadaUrl}
                        alt={`Portada de ${item.nombre}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        priority={false}
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        <Box size={32} />
                    </div>
                )}
                {/* Handle DnD */}
                <button
                    {...attributes}
                    {...listeners}
                    className="absolute top-1 right-1 z-20 p-1 bg-black/40 text-white/70 rounded-full hover:bg-black/70 hover:text-white focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing touch-none"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Reordenar ítem"
                    title="Arrastrar para reordenar"
                >
                    <GripVertical size={14} />
                </button>
                {/* Conteo de Imágenes */}
                {(item._count?.galeria ?? 0) > 0 && (
                    <div className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded-md flex items-center gap-1 backdrop-blur-sm">
                        <ImageIcon size={10} /> {item._count?.galeria}
                    </div>
                )}
                {/* Tipo Item Badge */}
                <div className={`absolute top-1 left-1 z-10 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${item.tipoItem === 'PRODUCTO' ? 'bg-sky-600/70 text-white' : 'bg-emerald-600/70 text-white'}`}>
                    {item.tipoItem === 'PRODUCTO' ? 'Producto' : 'Servicio'}
                </div>
            </div>

            {/* Contenido de la Tarjeta */}
            <div className={contentClasses}>
                {/* Categoría */}
                {item.categoria?.nombre && (
                    <span className="text-[0.65rem] text-indigo-300 font-medium mb-1">{item.categoria.nombre}</span>
                )}
                {/* Nombre */}
                <h4 className={titleClasses}>{item.nombre}</h4>
                {/* Descripción */}
                <p className={descriptionClasses}>{item.descripcion || <span className="italic text-zinc-500">Sin descripción</span>}</p>

                {/* Etiquetas */}
                {item.itemEtiquetas && item.itemEtiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {item.itemEtiquetas.slice(0, 3).map(({ etiqueta }) => (
                            <span key={etiqueta.id} className={tagClasses}>{etiqueta.nombre}</span>
                        ))}
                        {item.itemEtiquetas.length > 3 && (
                            <span className="text-[0.65rem] text-zinc-400">+{item.itemEtiquetas.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Indicadores */}
                <div className={indicatorContainerClasses}>
                    {/* <span title={`En Promoción: ${item.enPromocionActiva ? 'Sí' : 'No'}`}>
                        <TicketPercent size={13} className={item.enPromocionActiva ? 'text-amber-400' : indicatorIconClasses} />
                    </span> */}
                    {/* <span title={`Con Descuento: ${item.conDescuentoActivo ? 'Sí' : 'No'}`}>
                        <PercentCircle size={13} className={item.conDescuentoActivo ? 'text-teal-400' : indicatorIconClasses} />
                    </span> */}
                    <span title={`Público Objetivo: ${item.tienePublicoObjetivo ? 'Definido' : 'No definido'}`}>
                        <Users size={13} className={item.tienePublicoObjetivo ? indicatorActiveIconClasses : indicatorIconClasses} />
                    </span>
                    <span title={`Palabras Clave: ${item.tienePalabrasClave ? 'Definidas' : 'No definidas'}`}>
                        <Tag size={13} className={item.tienePalabrasClave ? indicatorActiveIconClasses : indicatorIconClasses} />
                    </span>
                    <span title={`Video: ${item.tieneVideo ? 'Sí' : 'No'}`}>
                        <Video size={13} className={item.tieneVideo ? 'text-red-400' : indicatorIconClasses} />
                    </span>
                    <span title={`Link Pago: ${item.tieneLinkPago ? 'Sí' : 'No'}`}>
                        <LinkIcon size={13} className={item.tieneLinkPago ? 'text-green-400' : indicatorIconClasses} />
                    </span>
                    {/* Stock */}
                    {item.stock !== null && (
                        <span title={`Stock: ${item.stock ?? 'N/A'}`} className={`text-xs ml-auto ${(item.stock ?? 0) <= (item.stockMinimo ?? 0) ? 'text-red-400 font-semibold' : 'text-zinc-300'}`}>
                            Stock: {item.stock}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal ---
export default function CatalogoItems({ catalogoId, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [items, setItems] = useState<ItemParaGridCatalogo[]>([]);
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState<string>(''); // ID de la categoría seleccionada, '' para todas
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- Carga de Datos (sin cambios) ---
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [itemsData, categoriasData] = await Promise.all([
                obtenerItemsParaCatalogo(catalogoId),
                obtenerNegocioCategorias(negocioId)
            ]);
            const processedItems = (itemsData || []).map(item => ({
                ...item,
                imagenPortadaUrl: item.imagenPortadaUrl || null,
                tienePublicoObjetivo: !!item.AquienVaDirigido?.trim(),
                tienePalabrasClave: !!item.palabrasClave?.trim(),
                tieneVideo: !!item.videoUrl?.trim(),
                tieneLinkPago: !!item.linkPago?.trim(),
            }));
            setItems(processedItems);
            setCategorias(categoriasData || []);
        } catch (err) {
            console.error("Error fetching catalog items:", err);
            setError(err instanceof Error ? err.message : "Error al cargar los ítems.");
            setItems([]); setCategorias([]);
        } finally { setLoading(false); }
    }, [catalogoId, negocioId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Limpiar mensaje de éxito (sin cambios) ---
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); }
        return () => clearTimeout(timer);
    }, [successMessage]);

    // --- Filtrado (sin cambios) ---
    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.categoria?.nombre && item.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesCategory = selectedCategoria === '' || item.categoriaId === selectedCategoria;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, selectedCategoria]);

    // --- DnD (sin cambios) ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedItems = arrayMove(items, oldIndex, newIndex);
            setItems(reorderedItems);
            const ordenData: ItemOrdenData[] = reorderedItems.map((item, index) => ({ id: item.id, orden: index }));
            setIsSavingOrder(true); setError(null);
            try {
                const result = await actualizarOrdenItemsCatalogo(catalogoId, ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
                setSuccessMessage("Orden guardado.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar orden");
                fetchData();
            } finally { setIsSavingOrder(false); }
        }
    };

    // --- Navegación (sin cambios) ---
    const navigateToEdit = (itemId: string) => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item`
        router.push(`${basePath}/${itemId}`);
    };

    // --- Crear nuevo ítem (sin cambios) ---
    const handleCrearItem = () => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item`
        router.push(`${basePath}/nuevo`);
    };

    // --- Renderizado ---
    const renderContent = () => {
        // ... (renderizado de loading, error, no items sin cambios) ...
        if (loading) return <div className="text-center py-10 text-zinc-400"><Loader2 className="animate-spin inline mr-2" /> Cargando ítems...</div>;
        if (error) return <div className="text-center py-10 text-red-500 bg-red-900/20 p-4 rounded border border-red-600">{error}</div>;
        if (items.length === 0) return <div className="text-center py-10 text-zinc-500">No hay ítems en este catálogo todavía.</div>;
        if (filteredItems.length === 0) return <div className="text-center py-10 text-zinc-500">No se encontraron ítems con los filtros aplicados.</div>;

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredItems.map(item => item.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map((item) => (
                            <SortableItemCard key={item.id} item={item} navigateToEdit={navigateToEdit} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        );
    };

    // --- Clases para botones de filtro ---
    const filterButtonBaseClasses = "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900";
    const filterButtonInactiveClasses = "bg-zinc-700/40 border-zinc-600 text-zinc-300 hover:bg-zinc-600/60 hover:border-zinc-500 focus:ring-blue-500";
    const filterButtonActiveClasses = "bg-blue-600 border-blue-500 text-white focus:ring-blue-400";


    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full">
            {/* Cabecera con Título y Filtros */}
            <div className="mb-4 flex flex-col gap-3">
                {/* Fila Superior: Título y Búsqueda */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <Package size={16} /> Ítems del Catálogo ({filteredItems.length})
                    </h3>
                    {/* Filtro por Texto */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Buscar ítem..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-zinc-900 border border-zinc-600 text-zinc-200 text-xs block w-full rounded-md p-1.5 pl-7 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => handleCrearItem()}
                            className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 flex items-center gap-1"
                        >
                            <Plus size={14} /> Nuevo Ítem
                        </button>
                    </div>
                </div>
                {/* Fila Inferior: Filtros de Categoría por Botones */}
                <div className="flex items-center gap-2 overflow-x-auto py-1"> {/* Permitir scroll horizontal si hay muchas categorías */}
                    <Filter size={14} className="text-zinc-500 flex-shrink-0" />
                    {/* Botón "Todas" */}
                    <button
                        onClick={() => setSelectedCategoria('')}
                        className={`${filterButtonBaseClasses} ${selectedCategoria === '' ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
                    >
                        Todas
                    </button>
                    {/* Botones por Categoría */}
                    {categorias.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategoria(cat.id)}
                            className={`${filterButtonBaseClasses} ${selectedCategoria === cat.id ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
                        >
                            {cat.nombre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Indicador de guardado */}
            {isSavingOrder && (
                <p className="mb-2 text-center text-xs text-blue-400 flex items-center justify-center gap-1">
                    <Loader2 size={12} className='animate-spin' /> Guardando orden...
                </p>
            )}
            {successMessage && (
                <p className="mb-2 text-center text-xs text-green-400 bg-green-900/30 p-1 rounded border border-green-600/50">
                    {successMessage}
                </p>
            )}

            {/* Contenedor del Grid */}
            <div className="flex-grow overflow-y-auto"> {/* Scroll vertical para el grid si es necesario */}
                {renderContent()}
            </div>
        </div>
    );
}
