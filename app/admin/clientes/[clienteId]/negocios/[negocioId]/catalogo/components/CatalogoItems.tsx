'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta según tu estructura
import {
    obtenerItemsCatalogoPorCatalogoId, // Asume que incluye categoria y itemEtiquetas.etiqueta
    actualizarOrdenItemsCatalogo
} from '@/app/admin/_lib/itemCatalogo.actions'; // Asumiendo que estas son tus actions
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions'; // Asumiendo que estas son tus actions
// import { obtenerNegocioEtiquetas } from '@/app/admin/_lib/negocioEtiqueta.actions'; // Asumiendo que estas son tus actions
import { ItemCatalogo, NegocioCategoria, NegocioEtiqueta, ItemCatalogoEtiqueta } from '@/app/admin/_lib/types'; // Asegúrate que las types incluyan todo lo necesario
import { Loader2, ListX, ListChecks, PlusIcon, GripVertical, SearchIcon, LayoutGrid } from 'lucide-react'; // Iconos
// Imports de dnd-kit
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Interfaces (Asegúrate que coincidan con tus tipos Prisma generados o definidos) ---
// Interfaz para la relación intermedia Item-Etiqueta
interface ItemCatalogoEtiquetaConEtiqueta extends ItemCatalogoEtiqueta {
    etiqueta: NegocioEtiqueta; // Asegura que la etiqueta esté incluida
}

// Interfaz extendida para el Ítem en la lista, asegurando que las relaciones están bien tipadas
interface ItemEnLista extends ItemCatalogo {
    categoria?: NegocioCategoria | null;
    itemEtiquetas?: ItemCatalogoEtiquetaConEtiqueta[]; // Usa la interfaz que incluye la etiqueta
    orden?: number | null; // Asegurar que orden esté
}

interface Props {
    catalogoId: string;
    negocioId: string; // Necesario para cargar categorías y etiquetas del negocio
}

// --- Componente Interno para la Fila Arrastrable ---
// Eliminamos la prop categoriaNombre, la obtendremos directamente de 'item'
function SortableItemRow({ item, onRowClick }: { item: ItemEnLista, onRowClick: (itemId: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases reutilizadas
    const tdClasses = "px-4 py-3 border-b border-zinc-700 text-sm align-top"; // align-top para mejor alineación si hay mucho texto
    const trClasses = `transition-colors ${isDragging ? 'bg-zinc-700 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const tagClasses = "text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";

    const handleRowClick = (e: React.MouseEvent) => {
        // Evita la navegación si se hace clic en el handle de arrastre
        if ((e.target as HTMLElement).closest('[data-dndkit-drag-handle]')) { return; }
        onRowClick(item.id);
    };

    // **CORRECCIÓN:** Obtener nombre de categoría directamente del item
    const categoriaNombre = item.categoria?.nombre || 'Sin Categoría';

    return (
        <tr ref={setNodeRef} style={style} className={trClasses} onClick={handleRowClick} title={`Editar ${item.nombre}`}>
            {/* Celda Ítem (Handle, Nombre, Desc, Cat, Etiquetas) */}
            <td className={`${tdClasses} cursor-pointer w-[80%]`}> {/* Añadir ancho para consistencia */}
                <div className="flex items-start gap-3"> {/* Aumentar gap ligeramente */}
                    {/* Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        data-dndkit-drag-handle
                        className="cursor-grab touch-none pt-1 text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" // Mejorar foco
                        aria-label="Mover ítem"
                        onClick={(e) => e.stopPropagation()} // Evitar que el click en el handle active onRowClick
                    >
                        <GripVertical size={18} />
                    </button>
                    {/* Contenido */}
                    <div className="flex-grow overflow-hidden">
                        <p className='font-medium text-zinc-100'>{item.nombre}</p>
                        <p className='text-xs text-zinc-400 mt-0.5 line-clamp-2'>{/* Permitir 2 líneas */}
                            {item.descripcion || <span className='italic text-zinc-600'>Sin descripción</span>}
                        </p>
                        {/* Categoría y Etiquetas */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5"> {/* Aumentar margen superior */}
                            {/* Categoría */}
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded-md w-fit border border-zinc-700"> {/* Estilo ligeramente diferente */}
                                <LayoutGrid size={12} /> {categoriaNombre}
                            </span>
                            {/* Etiquetas */}
                            {/* **CORRECCIÓN:** Asegurarse que itemEtiquetas y etiqueta existen antes de mapear */}
                            {item.itemEtiquetas && item.itemEtiquetas.length > 0 && item.itemEtiquetas.slice(0, 3).map(({ etiqueta }) => (
                                // Verificar que 'etiqueta' existe dentro del objeto
                                etiqueta ? (
                                    <span key={etiqueta.id} className={tagClasses} title={etiqueta.nombre}>
                                        {etiqueta.nombre}
                                    </span>
                                ) : null // O manejar el caso donde etiqueta no está definida si es posible
                            ))}
                            {item.itemEtiquetas && item.itemEtiquetas.length > 3 && (
                                <span className={`${tagClasses} italic`}>+{item.itemEtiquetas.length - 3} más</span>
                            )}
                        </div>
                    </div>
                </div>
            </td>
            {/* Celda Precio */}
            <td className={`${tdClasses} text-green-400 font-medium text-right cursor-pointer w-[20%]`}> {/* Añadir ancho */}
                {/* Manejar precio 0 o nulo/undefined */}
                {typeof item.precio === 'number' && item.precio > 0 ? `$${item.precio.toFixed(2)}` :
                    typeof item.precio === 'number' && item.precio === 0 ? 'Gratis' :
                        <span className='text-xs italic text-zinc-500'>No definido</span>}
            </td>
        </tr>
    );
}


// --- Componente Principal ---
export default function CatalogoItems({ catalogoId, negocioId }: Props) {
    const router = useRouter();
    const [itemsCatalogo, setItemsCatalogo] = useState<ItemEnLista[]>([]); // Lista completa para D&D
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    // No necesitamos guardar etiquetas disponibles aquí si solo las usamos para filtros, pero sí para la UI de filtros
    // const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<NegocioEtiqueta[]>([]); // Mantenido por si se usan en UI
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Estados para filtros
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all'); // 'all' para todas
    const [filtroTexto, setFiltroTexto] = useState('');

    // Clases de Tailwind (revisadas para consistencia)
    const containerClasses = "flex flex-col h-full bg-zinc-900 rounded-lg shadow-md"; // Añadir fondo y sombra al contenedor principal si es necesario
    const headerClasses = "p-4 border-b border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3";
    const filterContainerClasses = "p-4 space-y-3";
    const inputBaseClasses = "bg-zinc-800 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    const filterButtonBase = "px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500";
    const filterButtonActive = "bg-blue-600 text-white";
    const filterButtonInactive = "bg-zinc-700 text-zinc-300 hover:bg-zinc-600";
    const tableContainerClasses = "flex-grow overflow-y-auto border border-zinc-700 rounded-b-lg"; // Redondeo solo abajo si header está fuera
    const tableClasses = "table-fixed w-full text-left text-zinc-300 border-collapse";
    const thClasses = "px-4 py-2 border-b border-zinc-600 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider bg-zinc-800"; // Fondo a TH
    const categoryHeaderRowClasses = "bg-zinc-800 sticky top-0 z-10"; // Header de categoría pegajoso
    const categoryHeaderCellClasses = "px-3 py-1.5 text-sm font-semibold text-zinc-300 border-b border-zinc-600"; // Texto más grande y padding ajustado


    // Sensores para dnd-kit
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Evita iniciar drag con clicks pequeños
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Carga inicial de datos (Items, Categorías, Etiquetas)
    useEffect(() => {
        if (!catalogoId || !negocioId) {
            setError("Faltan IDs necesarios (Catálogo o Negocio).");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setItemsCatalogo([]); setCategorias([]);//elimine setEtiquetasDisponibles([]); // Reiniciar estados

        const fetchInitialData = async () => {
            try {
                // Asegúrate que las funciones action devuelvan los tipos correctos o usa 'any' temporalmente si hay dudas
                const [itemsData, categoriasData] = await Promise.all([ //elimine etiquetasData
                    obtenerItemsCatalogoPorCatalogoId(catalogoId) as Promise<ItemEnLista[]>, // Incluye categoria y itemEtiquetas.etiqueta
                    obtenerNegocioCategorias(negocioId) as Promise<NegocioCategoria[]>,
                    // obtenerNegocioEtiquetas(negocioId) as Promise<NegocioEtiqueta[]>
                ]);

                // Ordenar items por 'orden' ASC, los nulos al final
                const itemsOrdenados = (itemsData || []).sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity));

                // **CORRECCIÓN:** Simplificar el mapeo, solo asegurar 'orden'
                setItemsCatalogo(itemsOrdenados.map((item, index) => ({
                    ...item,
                    orden: item.orden ?? index + 1, // Asignar orden basado en índice si es null
                    // No es necesario re-mapear itemEtiquetas aquí si Prisma ya lo incluye correctamente
                })));

                setCategorias(categoriasData || []);
                // setEtiquetasDisponibles(etiquetasData || []);

            } catch (err) {
                console.error("Error al cargar datos del catálogo:", err);
                setError("No se pudieron cargar los ítems, categorías o etiquetas. Revisa la consola.");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [catalogoId, negocioId]); // Dependencias de carga

    // --- Lógica de Filtrado ---
    const filteredItems = useMemo(() => {
        return itemsCatalogo.filter(item => {
            // Match por categoría
            const categoryMatch = selectedCategoryId === 'all' || item.categoriaId === selectedCategoryId || (selectedCategoryId === 'sin-categoria' && !item.categoriaId);
            // Match por texto (nombre, descripción)
            const searchMatch = !filtroTexto ||
                item.nombre.toLowerCase().includes(filtroTexto.toLowerCase()) ||
                item.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) || false;
            // Podrías añadir filtro por etiquetas aquí si lo necesitas
            return categoryMatch && searchMatch;
        });
    }, [itemsCatalogo, selectedCategoryId, filtroTexto]);

    // --- Lógica de Agrupación para Renderizado ---
    const itemsAgrupados = useMemo(() => {
        const grouped: { [key: string]: ItemEnLista[] } = {};
        // Agrupar items filtrados por su categoriaId o 'sin-categoria'
        filteredItems.forEach(item => {
            const catId = item.categoriaId || 'sin-categoria';
            if (!grouped[catId]) { grouped[catId] = []; }
            grouped[catId].push(item);
        });
        return grouped;
    }, [filteredItems]);

    // Obtener categorías que tienen items filtrados + la opción "sin categoría" si aplica
    const categoriasConItemsFiltrados = useMemo(() => {
        // Empezar con las categorías reales que tienen items
        const cats = categorias.filter(cat => itemsAgrupados[cat.id]?.length > 0);
        // Ordenar categorías alfabéticamente (opcional)
        cats.sort((a, b) => a.nombre.localeCompare(b.nombre));
        // Añadir "Sin Categoría" al PRINCIPIO o FINAL si tiene items y si el filtro no es específico de otra categoría
        if (itemsAgrupados['sin-categoria']?.length > 0) {
            // Añadir al principio
            cats.unshift({ id: 'sin-categoria', nombre: 'Sin Categoría', negocioId: negocioId, createdAt: new Date(), updatedAt: new Date() }); // Cast con campos requeridos
            // O al final:
            // cats.push({ id: 'sin-categoria', nombre: 'Sin Categoría', negocioId: negocioId, createdAt: new Date(), updatedAt: new Date() });
        }
        return cats;
    }, [categorias, itemsAgrupados, negocioId]);


    // --- Manejador Drag End para Items ---
    const handleDragEndItems = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            // 1. Encuentra índices en la lista COMPLETA (itemsCatalogo)
            const oldIndex = itemsCatalogo.findIndex((item) => item.id === active.id);
            const newIndex = itemsCatalogo.findIndex((item) => item.id === over.id);

            if (oldIndex === -1 || newIndex === -1) {
                console.warn("Item arrastrado o destino no encontrado en la lista completa.");
                return; // Índices no válidos
            }

            // 2. Reordena la lista COMPLETA
            const reorderedItems = arrayMove(itemsCatalogo, oldIndex, newIndex);

            // 3. Recalcula el campo 'orden' para TODOS los items en la lista reordenada
            const finalItems = reorderedItems.map((item, index) => ({
                ...item,
                orden: index + 1 // Asigna orden secuencial basado en la nueva posición
            }));

            // 4. Actualización optimista de la UI (con la lista completa y órdenes actualizados)
            setItemsCatalogo(finalItems);

            // 5. Prepara los datos solo con ID y nuevo orden para la acción
            const ordenData = finalItems.map(({ id, orden }) => ({ id, orden: orden as number }));

            // 6. Llama a la acción para guardar en la BD
            setIsSaving(true);
            setError(null);
            try {
                await actualizarOrdenItemsCatalogo(ordenData);
                // Podrías mostrar un mensaje de éxito temporal aquí si quieres
            } catch (saveError) {
                console.error('Error al guardar el orden de ítems:', saveError);
                setError('Error al guardar el nuevo orden. Se revirtieron los cambios.');
                // Revertir al estado anterior si falla el guardado
                setItemsCatalogo(itemsCatalogo); // Revertir a la lista original antes del drag
            } finally {
                setIsSaving(false);
            }
        }
    }, [itemsCatalogo]); // Dependencia CLAVE: la lista completa


    // Navegación
    const handleCrearItem = () => { router.push(`/admin/negocios/${negocioId}/catalogo/${catalogoId}/item/nuevo`); };
    const handleEditarItem = (itemId: string) => { router.push(`/admin/negocios/${negocioId}/catalogo/${catalogoId}/item/${itemId}`); };


    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera y Filtros */}
            <div className={headerClasses}>
                {/* Título y Botón Crear */}
                <div className="flex-1 flex items-center justify-between w-full">
                    <h3 className="text-lg font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <LayoutGrid size={18} /> Ítems del Catálogo {/* Icono cambiado */}
                    </h3>
                    <button
                        onClick={handleCrearItem}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500"
                        title="Añadir nuevo ítem"
                    >
                        <PlusIcon size={16} />
                        <span>Añadir Ítem</span>
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className={filterContainerClasses}>
                {/* Input de Búsqueda */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        className={`${inputBaseClasses} pl-9`}
                        value={filtroTexto}
                        onChange={(e) => setFiltroTexto(e.target.value)}
                        aria-label="Filtrar ítems por texto"
                    />
                </div>
                {/* Filtros de Categoría */}
                {!loading && categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center pt-2">
                        <span className="text-sm font-medium text-zinc-400 mr-2">Categoría:</span>
                        <button
                            onClick={() => setSelectedCategoryId('all')}
                            className={`${filterButtonBase} ${selectedCategoryId === 'all' ? filterButtonActive : filterButtonInactive}`}
                        >
                            Todas
                        </button>
                        {/* Botón para Sin Categoría si existen items sin ella */}
                        {itemsCatalogo.some(item => !item.categoriaId) && (
                            <button
                                onClick={() => setSelectedCategoryId('sin-categoria')}
                                className={`${filterButtonBase} ${selectedCategoryId === 'sin-categoria' ? filterButtonActive : filterButtonInactive}`}
                            >
                                Sin Categoría
                            </button>
                        )}
                        {/* Botones para categorías reales */}
                        {categorias.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`${filterButtonBase} ${selectedCategoryId === cat.id ? filterButtonActive : filterButtonInactive}`}
                            >
                                {cat.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Indicador de guardado */}
            {isSaving && (
                <div className="px-4 pb-2 flex items-center justify-center text-xs text-blue-300">
                    <Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden...
                </div>
            )}
            {/* Error general o de guardado */}
            {error && !loading && ( // Mostrar error si existe y no estamos cargando
                <p className="mx-4 mb-2 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600/50">
                    {error}
                </p>
            )}


            {/* Contenido Principal: Tabla o Mensajes */}
            <div className={tableContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-3" />
                        <span>Cargando ítems...</span>
                    </div>
                ) : !error && itemsCatalogo.length === 0 ? ( // Solo mostrar si no hubo error y la lista original está vacía
                    <div className="flex flex-col items-center justify-center text-center py-16">
                        <ListChecks className="h-10 w-10 text-zinc-500 mb-3" />
                        <p className='text-zinc-400 text-sm'>Aún no hay ítems en este catálogo.</p>
                        <p className='text-zinc-500 text-xs mt-1'>Puedes empezar añadiendo uno.</p>
                    </div>
                ) : !error && filteredItems.length === 0 ? ( // Mostrar si no hubo error pero los filtros no devuelven nada
                    <div className="flex flex-col items-center justify-center text-center py-16">
                        <ListX className="h-10 w-10 text-zinc-500 mb-3" />
                        <p className='text-zinc-400 text-sm'>No se encontraron ítems que coincidan.</p>
                        <p className='text-zinc-500 text-xs mt-1'>Intenta ajustar los filtros o el término de búsqueda.</p>
                    </div>
                ) : !error ? ( // Solo renderizar tabla si no hay error
                    // Tabla Arrastrable
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
                        {/* Usamos itemsCatalogo para SortableContext para que el D&D funcione incluso con filtros */}
                        <SortableContext items={itemsCatalogo.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <table className={tableClasses}>
                                <thead className="sticky top-0 z-20">
                                    <tr>
                                        <th className={`${thClasses} w-[80%]`}>Ítem</th>
                                        <th className={`${thClasses} w-[20%] text-right`}>Precio</th>
                                    </tr>
                                </thead>
                                {/* Mapear sobre las categorías que tienen items *filtrados* */}
                                {categoriasConItemsFiltrados.map(categoria => (
                                    <tbody key={categoria.id} className="divide-y divide-zinc-800">{/* Divisor más oscuro */}
                                        {/* Fila de Cabecera de Categoría */}
                                        <tr className={categoryHeaderRowClasses}>
                                            <td colSpan={2} className={categoryHeaderCellClasses}>
                                                {categoria.nombre} ({itemsAgrupados[categoria.id]?.length || 0}) {/* Mostrar contador */}
                                            </td>
                                        </tr>
                                        {/* Filas de Items (arrastrables) */}
                                        {/* Mapear sobre los items *filtrados* de esta categoría */}
                                        {itemsAgrupados[categoria.id]?.map((item) => (
                                            <SortableItemRow
                                                key={item.id}
                                                item={item}
                                                // Ya no se pasa categoriaNombre
                                                onRowClick={handleEditarItem}
                                            />
                                        ))}
                                    </tbody>
                                ))}
                            </table>
                        </SortableContext>
                    </DndContext>
                ) : null /* No renderizar nada más si hubo error y ya se mostró */}
            </div>
        </div>
    );
}

