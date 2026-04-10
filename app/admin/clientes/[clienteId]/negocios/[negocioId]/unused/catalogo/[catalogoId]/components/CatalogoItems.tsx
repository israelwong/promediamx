// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/components/CatalogoItems.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, rectSortingStrategy, useSortable, sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Loader2, GripVertical, Package, Tag, Image as ImageIconLucide, Link as LinkIconLucide,
    Users, Search, Filter, Box, Plus, AlertCircle, CheckCircle
} from 'lucide-react';

import { Button } from '@/app/components/ui/button'; // Componente de botón de UI

// Actions y tipos Zod
import {
    obtenerItemsParaCatalogo,
    actualizarOrdenItemsCatalogo
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.actions';
import {
    type ItemParaGridCatalogoType, // Tipo Zod para el ítem en la grilla
    type ActualizarOrdenItemsData
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.schemas';
import { obtenerNegocioCategorias } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.actions'; // Para filtro
import { type NegocioCategoriaType } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.schemas'; // Tipo Zod para categoría
// import { ActionResult } from '@/app/admin/_lib/types'; // Si se necesita para manejar errores de forma más granular

interface Props {
    catalogoId: string;
    negocioId: string;
    clienteId: string; // clienteId es necesario para la navegación y actions
}

function SortableItemCard({ item, navigateToEdit }: { item: ItemParaGridCatalogoType; navigateToEdit: (id: string) => void; }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    const cardClasses = "bg-zinc-800 rounded-lg shadow-md overflow-hidden border border-zinc-700 flex flex-col h-full group cursor-pointer hover:border-blue-600/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-600 transition-all duration-150";
    const imageContainerClasses = "relative aspect-video w-full bg-zinc-700/50";
    const contentClasses = "p-3 flex flex-col flex-grow";
    const titleClasses = "text-sm font-semibold text-zinc-100 mb-1 line-clamp-1 group-hover:text-blue-300 transition-colors";
    const descriptionClasses = "text-xs text-zinc-400 mb-2 line-clamp-2 flex-grow min-h-[2.25rem]"; // min-h para consistencia
    const tagClasses = "text-[0.65rem] bg-zinc-600/80 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";
    const indicatorContainerClasses = "flex flex-wrap items-center gap-x-2 gap-y-1 mt-auto border-t border-zinc-700 pt-2"; // mt-auto para empujar al fondo
    const indicatorIconClasses = "text-zinc-500";
    const indicatorActiveIconClasses = "text-blue-400";

    // Campos calculados (se mantienen en el cliente para la UI)
    const tienePublicoObjetivo = !!item.AquienVaDirigido?.trim();
    const tienePalabrasClave = !!item.palabrasClave?.trim();
    // const tieneVideo = !!item.videoUrl?.trim();
    const tieneLinkPago = !!item.linkPago?.trim();
    // const enPromocionActiva = item._count?.itemCatalogoOfertas ? item._count.itemCatalogoOfertas > 0 : false; // Ejemplo, ajustar según lógica de ofertas

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${cardClasses} ${isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}
            onClick={() => navigateToEdit(item.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToEdit(item.id); }}
            tabIndex={0} // Hacerlo enfocable
            role="button"
            aria-label={`Editar ítem: ${item.nombre}`}
        >
            <div className={imageContainerClasses}>
                {item.imagenPortadaUrl ? (
                    <Image
                        src={item.imagenPortadaUrl}
                        alt={`Portada de ${item.nombre}`}
                        fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover" priority={false} loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x169/404040/9ca3af?text=Error'; }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500"><Box size={32} /></div>
                )}
                <button
                    {...attributes} {...listeners}
                    className="absolute top-1.5 right-1.5 z-20 p-1.5 bg-black/40 text-white/70 rounded-full hover:bg-black/70 hover:text-white focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing touch-none"
                    onClick={(e) => e.stopPropagation()} aria-label="Reordenar ítem" title="Arrastrar para reordenar"
                > <GripVertical size={14} /> </button>
                {(item._count?.galeria ?? 0) > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 z-10 px-1.5 py-0.5 bg-black/50 text-white text-[10px] font-medium rounded-md flex items-center gap-1 backdrop-blur-sm">
                        <ImageIconLucide size={10} /> {item._count?.galeria}
                    </div>
                )}
                <div className={`absolute top-1.5 left-1.5 z-10 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm ${item.tipoItem === 'PRODUCTO' ? 'bg-sky-600/80 text-white' : 'bg-emerald-600/80 text-white'}`}>
                    {item.tipoItem === 'PRODUCTO' ? 'Producto' : 'Servicio'}
                </div>
            </div>

            <div className={contentClasses}>
                {item.categoria?.nombre && (
                    <span className="text-[0.7rem] text-indigo-400 font-medium mb-0.5 block truncate">{item.categoria.nombre}</span>
                )}
                <h4 className={titleClasses}>{item.nombre}</h4>
                <p className={descriptionClasses}>{item.descripcion || <span className="italic text-zinc-500">Sin descripción</span>}</p>

                {item.itemEtiquetas && item.itemEtiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {item.itemEtiquetas.slice(0, 2).map(({ etiqueta }) => ( // Mostrar solo 2 para no saturar
                            <span key={etiqueta.id} className={tagClasses}>{etiqueta.nombre}</span>
                        ))}
                        {item.itemEtiquetas.length > 2 && (
                            <span className="text-[0.65rem] text-zinc-400 self-end">+{item.itemEtiquetas.length - 2} más</span>
                        )}
                    </div>
                )}

                <div className={indicatorContainerClasses}>
                    <span title={`Público Objetivo: ${tienePublicoObjetivo ? 'Definido' : 'No definido'}`}>
                        <Users size={13} className={tienePublicoObjetivo ? indicatorActiveIconClasses : indicatorIconClasses} />
                    </span>
                    <span title={`Palabras Clave: ${tienePalabrasClave ? 'Definidas' : 'No definidas'}`}>
                        <Tag size={13} className={tienePalabrasClave ? indicatorActiveIconClasses : indicatorIconClasses} />
                    </span>
                    {/* <span title={`Video: ${tieneVideo ? 'Sí' : 'No'}`}>
                        <Video size={13} className={tieneVideo ? 'text-red-400' : indicatorIconClasses} />
                    </span> */}
                    <span title={`Link Pago: ${tieneLinkPago ? 'Sí' : 'No'}`}>
                        <LinkIconLucide size={13} className={tieneLinkPago ? 'text-green-400' : indicatorIconClasses} />
                    </span>
                    {item.stock !== null && item.stock !== undefined && (
                        <span title={`Stock: ${item.stock}`} className={`text-xs ml-auto font-medium ${(item.stock ?? 0) <= (item.stockMinimo ?? 0) ? 'text-orange-400' : 'text-zinc-300'}`}>
                            Stock: {item.stock}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CatalogoItems({ catalogoId, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [items, setItems] = useState<ItemParaGridCatalogoType[]>([]);
    const [categorias, setCategorias] = useState<NegocioCategoriaType[]>([]); // Usar tipo Zod
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoria, setSelectedCategoria] = useState<string>('');
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const [itemsResult, categoriasResult] = await Promise.all([
                obtenerItemsParaCatalogo(catalogoId),
                obtenerNegocioCategorias(negocioId) // Esta acción ya devuelve PrismaNegocioCategoria[]
            ]);

            if (itemsResult.success && itemsResult.data) {
                // Los campos calculados se mantienen en el cliente
                setItems(itemsResult.data);
            } else {
                setError(itemsResult.error || "Error al cargar los ítems.");
                setItems([]);
            }

            // La acción obtenerNegocioCategorias devuelve un array directamente, no ActionResult
            // Adaptar si la refactorizaste para devolver ActionResult
            setCategorias((categoriasResult || []).map(cat => ({
                ...cat,
                createdAt: new Date(cat.createdAt),
                updatedAt: new Date(cat.updatedAt),
            })) as NegocioCategoriaType[]);


        } catch (err) {
            console.error("Error fetching catalog items or categories:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos.");
            setItems([]); setCategorias([]);
        } finally { setLoading(false); }
    }, [catalogoId, negocioId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm === '' ||
                item.nombre.toLowerCase().includes(searchLower) ||
                (item.descripcion && item.descripcion.toLowerCase().includes(searchLower)) ||
                (item.categoria?.nombre && item.categoria.nombre.toLowerCase().includes(searchLower));
            const matchesCategory = selectedCategoria === '' || item.categoriaId === selectedCategoria;
            return matchesSearch && matchesCategory;
        });
    }, [items, searchTerm, selectedCategoria]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }), // Mayor distancia para no interferir con clic
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const reorderedItems = arrayMove(items, oldIndex, newIndex);
            const itemsWithNewOrderVisual = reorderedItems.map((item, index) => ({ ...item, orden: index }));
            setItems(itemsWithNewOrderVisual); // Actualizar UI inmediatamente

            const ordenData: ActualizarOrdenItemsData = itemsWithNewOrderVisual.map((item) => ({
                id: item.id,
                orden: item.orden as number, // orden ahora es number
            }));

            setIsSavingOrder(true); setError(null); setSuccessMessage(null);
            try {
                // Pasar clienteId y negocioId a la acción
                const result = await actualizarOrdenItemsCatalogo(catalogoId, clienteId, negocioId, ordenData);
                if (!result.success) throw new Error(result.error || "Error al guardar orden");
                setSuccessMessage("Orden de ítems guardado.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al guardar orden");
                await fetchData(); // Revertir a orden de DB si falla el guardado
            } finally { setIsSavingOrder(false); }
        }
    };

    const navigateToEdit = (itemId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`);
    };
    const handleCrearItem = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/nuevo`);
    };

    const renderContent = () => {
        if (loading) return <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-400"><Loader2 className="h-8 w-8 animate-spin mb-3" /><span>Cargando ítems del catálogo...</span></div>;
        if (error) return <div className="flex flex-col items-center justify-center text-center py-10 bg-red-900/10 border border-red-600/30 text-red-400 p-6 rounded-lg"><AlertCircle size={32} className="mb-2" />{error}</div>;
        if (items.length === 0) return (
            <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-500">
                <Box size={48} className="mb-4" />
                <p className="text-lg font-medium mb-2">Este catálogo aún no tiene ítems.</p>
                <p className="text-sm mb-6">Comienza añadiendo tu primer producto o servicio.</p>
                <Button
                    onClick={handleCrearItem}
                    className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center gap-2"
                >
                    <Plus size={16} /> Añadir Primer Ítem
                </Button>
            </div>
        );
        if (filteredItems.length === 0) return <div className="text-center py-10 text-zinc-500">No se encontraron ítems con los filtros aplicados.</div>;

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredItems.map(item => item.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4"> {/* Ajustar columnas para diferentes tamaños */}
                        {filteredItems.map((item) => (
                            <SortableItemCard key={item.id} item={item} navigateToEdit={navigateToEdit} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        );
    };

    const filterButtonBaseClasses = "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900";
    const filterButtonInactiveClasses = "bg-zinc-700/50 border-zinc-600 text-zinc-300 hover:bg-zinc-600/70 hover:border-zinc-500 focus:ring-blue-500";
    const filterButtonActiveClasses = "bg-blue-600 border-blue-500 text-white focus:ring-blue-400 shadow-md";

    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full">
            <div className="p-4 border-b border-zinc-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-zinc-100 whitespace-nowrap flex items-center gap-2">
                        <Package size={18} className="text-blue-400" /> Ítems del Catálogo <span className="text-sm text-zinc-400">({filteredItems.length} / {items.length})</span>
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[200px]">
                            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <input
                                type="text" placeholder="Buscar por nombre, descripción..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md py-2 px-2.5 pl-8 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <Button
                            onClick={handleCrearItem}
                            variant='secondary'
                        >
                            <Plus size={14} /> Nuevo Ítem
                        </Button>
                    </div>
                </div>
                {categorias.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
                        <Filter size={14} className="text-zinc-400 flex-shrink-0" />
                        <button onClick={() => setSelectedCategoria('')}
                            className={`${filterButtonBaseClasses} ${selectedCategoria === '' ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
                        > Todas </button>
                        {categorias.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategoria(cat.id)}
                                className={`${filterButtonBaseClasses} ${selectedCategoria === cat.id ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
                            > {cat.nombre} </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="px-4 pt-2">
                {isSavingOrder && (
                    <p className="mb-2 text-center text-xs text-blue-300 p-1.5 bg-blue-500/10 rounded-md border border-blue-500/30 flex items-center justify-center gap-1">
                        <Loader2 size={12} className='animate-spin' /> Guardando orden...
                    </p>
                )}
                {successMessage && (
                    <p className="mb-2 text-center text-xs text-green-300 bg-green-500/10 p-1.5 rounded-md border border-green-500/30 flex items-center justify-center gap-1">
                        <CheckCircle size={14} /> {successMessage}
                    </p>
                )}
            </div>

            <div className="flex-grow overflow-y-auto p-4">
                {renderContent()}
            </div>
        </div>
    );
}
