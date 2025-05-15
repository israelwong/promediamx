// app/admin/tareas/components/ListaTareas.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- DnD Imports ---
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// --- Fin DnD Imports ---

// Importar acciones refactorizadas
import {
    obtenerTareasConDetalles,
    obtenerCategoriasParaFiltro,
    actualizarOrdenTareas
} from '@/app/admin/_lib/tareas.actions'; // Ajusta ruta!

// Importar tipos CENTRALIZADOS (¡Ahora son los explícitos!)
import {
    TareaConDetalles,
    OrdenarTareasInput,
    CategoriaTareaSimple
} from '@/app/admin/_lib/tareas.type';

import { Loader2, Search, ListFilter, GripVertical, Image as ImageIcon, GalleryHorizontal, Check, PlusIcon } from 'lucide-react';
import { Input } from "@/app/components/ui/input"; // Ajusta ruta

// --- Componente SortableTableRow (Usa el tipo explícito TareaConDetalles) ---
function SortableTableRow({ id, tarea, onRowClick }: { id: string; tarea: TareaConDetalles; onRowClick: (id: string) => void }) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    // Clases
    const tdClasses = "px-2 py-1.5 text-xs border-b border-zinc-700 align-middle";
    const tagClasses = "text-[0.65rem] px-1.5 py-0.5 rounded-full inline-block mr-1 mb-1 whitespace-nowrap";

    const handleRowClickInternal = (e: React.MouseEvent<HTMLTableRowElement>) => {
        // Evita la navegación si se hace clic en el handle de DnD
        if ((e.target as HTMLElement).closest('button[data-dnd-handle="true"]')) return;
        onRowClick(tarea.id);
    };

    // Accede a los campos según la definición explícita de TareaConDetalles
    const ejecucionesCount = tarea._count?.TareaEjecutada ?? 0;
    const galeriaCount = tarea._count?.TareaGaleria ?? 0;
    const categoriaColor = tarea.CategoriaTarea?.color || '#FFFFFF';

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`bg-zinc-800 hover:bg-zinc-700/50 transition-colors duration-100 cursor-pointer ${isDragging ? 'shadow-lg ring-1 ring-blue-500' : ''}`}
            onClick={handleRowClickInternal}
            title={`Ver/Editar Tarea: ${tarea.nombre}`}
        >
            {/* Handle DnD */}
            <td className={`${tdClasses} text-center w-10`}>
                <button
                    {...attributes} {...listeners} data-dnd-handle="true"
                    className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()} // Evita que el click en el botón dispare onRowClick
                >
                    <GripVertical size={14} />
                </button>
            </td>
            {/* Icono */}
            <td className={`${tdClasses} text-center w-8`}>
                {tarea.iconoUrl ? <ImageIcon size={12} className="text-blue-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            {/* Galería */}
            <td className={`${tdClasses} text-center w-8`}>
                {galeriaCount > 0 ? <GalleryHorizontal size={12} className="text-purple-400 mx-auto" /> : <span className="text-zinc-600">-</span>}
            </td>
            {/* Nombre Tarea y Función */}
            <td className={`${tdClasses} font-medium text-zinc-100 max-w-[200px] truncate`}>
                <span title={tarea.nombre}>{tarea.nombre}</span>
                {/* Verifica si tareaFuncion existe antes de acceder */}
                {tarea.tareaFuncion && (
                    <span className="block text-[0.7rem] text-blue-400/80 font-normal truncate" title={`Función: ${tarea.tareaFuncion.nombreVisible}`}>
                        Fn: {tarea.tareaFuncion.nombreVisible}
                    </span>
                )}
            </td>
            {/* Categoría */}
            <td className={tdClasses}>
                {/* Verifica si CategoriaTarea existe */}
                {tarea.CategoriaTarea ? (
                    <span className={`${tagClasses} border`} style={{ backgroundColor: `${categoriaColor}20`, color: categoriaColor, borderColor: `${categoriaColor}80` }}>
                        {tarea.CategoriaTarea.nombre}
                    </span>
                ) : <span className="text-zinc-600 italic">N/A</span>}
            </td>
            {/* Etiquetas */}
            <td className={`${tdClasses} max-w-[150px]`}>
                {/* Verifica si etiquetas existe y tiene elementos */}
                {tarea.etiquetas && tarea.etiquetas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {/* Mapea las etiquetas, verificando si etiquetaTarea existe */}
                        {tarea.etiquetas.slice(0, 2).map(({ etiquetaTarea }, index) =>
                            etiquetaTarea ? (
                                <span key={etiquetaTarea.id || index} className={`${tagClasses} bg-teal-900/70 text-teal-300 border border-teal-700/50`}>
                                    {etiquetaTarea.nombre}
                                </span>
                            ) : null
                        )}
                        {tarea.etiquetas.length > 2 && <span className={`${tagClasses} bg-zinc-700 text-zinc-400`}>...</span>}
                    </div>
                ) : <span className="text-zinc-600 italic text-xs">Ninguna</span>}
            </td>
            {/* Precio */}
            <td className={`${tdClasses} text-right w-16`}>
                {/* Verifica si precio no es null y es mayor que 0 */}
                {tarea.precio != null && tarea.precio > 0 ? (
                    <span className="font-semibold text-emerald-400">${tarea.precio.toFixed(2)}</span>
                ) : <span className="text-zinc-600">-</span>}
            </td>
            {/* Ejecuciones */}
            <td className={`${tdClasses} text-center w-16 ${ejecucionesCount > 0 ? 'text-cyan-300 font-medium' : 'text-zinc-500'}`}>
                {ejecucionesCount}
            </td>
            {/* Status */}
            <td className={`${tdClasses} text-center w-20`}>
                <span className={`font-medium px-2 py-0.5 rounded-full text-[10px] ${tarea.status === 'activo' ? 'bg-green-500/20 text-green-300' : 'bg-zinc-600/50 text-zinc-400'}`}>
                    {/* Capitaliza el status para mostrar */}
                    {tarea.status.charAt(0).toUpperCase() + tarea.status.slice(1)}
                </span>
            </td>
        </tr>
    );
}


// --- Componente Principal ListaTareas ---
export default function ListaTareas() {
    const router = useRouter();
    // Estados usan los tipos explícitos importados
    const [todasLasTareas, setTodasLasTareas] = useState<TareaConDetalles[]>([]);
    const [tareasFiltradas, setTareasFiltradas] = useState<TareaConDetalles[]>([]);
    const [categorias, setCategorias] = useState<CategoriaTareaSimple[]>([]);
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Clases Tailwind (sin cambios)
    const inputBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500 h-8";
    const categoryButtonBase = "px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-150 flex items-center gap-1";
    const categoryButtonInactive = "bg-zinc-700/50 border-zinc-600 text-zinc-300 hover:bg-zinc-600/50 hover:border-zinc-500";
    const categoryButtonActive = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-400 ring-offset-1 ring-offset-zinc-900";
    const primaryButtonClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md flex items-center gap-1 whitespace-nowrap";

    // --- Carga inicial de datos (Usa las acciones refactorizadas) ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Llamar acciones en paralelo que devuelven ActionResult
            const [tareasResult, categoriasResult] = await Promise.all([
                obtenerTareasConDetalles(),
                obtenerCategoriasParaFiltro()
            ]);

            // Manejar resultado de tareas
            if (tareasResult.success) {
                // Ahora tareasResult.data es TareaConDetalles[] (o [] si no hay datos)
                const tareasData = tareasResult.data || [];
                setTodasLasTareas(tareasData);
                setTareasFiltradas(tareasData); // Inicialmente mostrar todas
            } else {
                // Si falla, lanzar error con el mensaje de la acción
                throw new Error(tareasResult.error || "Error desconocido cargando tareas.");
            }

            // Manejar resultado de categorías
            if (categoriasResult.success) {
                // categoriasResult.data es CategoriaTareaSimple[] (o [])
                setCategorias(categoriasResult.data || []);
            } else {
                // No es fatal si fallan las categorías, mostrar warning en consola
                console.warn("Error cargando categorías para filtro:", categoriasResult.error);
                setCategorias([]); // Dejar categorías vacías
            }

        } catch (err: unknown) { // Captura cualquier error lanzado
            console.error("Error fetching data:", err);
            // Establece el mensaje de error en el estado
            setError(err instanceof Error ? err.message : "Ocurrió un error al cargar los datos.");
            // Limpia los estados de datos en caso de error
            setTodasLasTareas([]);
            setTareasFiltradas([]);
            setCategorias([]);
        } finally {
            setLoading(false); // Asegura que loading se quite siempre
        }
    }, []); // No hay dependencias externas, solo se ejecuta al montar

    // Ejecuta fetchData al montar el componente
    useEffect(() => {
        fetchData();
    }, [fetchData]); // Incluye fetchData como dependencia

    // --- Lógica de Filtrado (Adaptada para usar categoriaTareaId) ---
    useEffect(() => {
        let tareasResult = todasLasTareas;

        // Filtrar por nombre (insensible a mayúsculas/minúsculas)
        if (filtroNombre.trim()) {
            const lowerFiltroNombre = filtroNombre.toLowerCase();
            tareasResult = tareasResult.filter(t =>
                t.nombre.toLowerCase().includes(lowerFiltroNombre)
            );
        }

        // Filtrar por ID de categoría seleccionada
        if (filtroCategoriaId) {
            tareasResult = tareasResult.filter(t =>
                t.categoriaTareaId === filtroCategoriaId // Compara directamente con la FK
            );
        }

        setTareasFiltradas(tareasResult);
    }, [filtroNombre, filtroCategoriaId, todasLasTareas]); // Dependencias del efecto de filtrado

    // --- DnD Handlers ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Iniciar drag con pequeño movimiento
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }) // Soporte teclado
    );

    // --- Manejador Drag End (Usa orden 0-based consistente) ---
    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        // Solo proceder si el item se movió a una posición diferente
        if (over && active.id !== over.id) {
            // Encontrar índices en la lista filtrada actual
            const oldIndex = tareasFiltradas.findIndex((t) => t.id === active.id);
            const newIndex = tareasFiltradas.findIndex((t) => t.id === over.id);

            // Si no se encuentran los índices (raro, pero posible), no hacer nada
            if (oldIndex === -1 || newIndex === -1) return;

            // 1. Reordenar el estado local 'tareasFiltradas' para UI inmediata
            const reorderedTareasFiltradas = arrayMove(tareasFiltradas, oldIndex, newIndex);

            // 2. Asignar nuevo orden basado en el ÍNDICE (0-based)
            const finalTareasConNuevoOrden = reorderedTareasFiltradas.map((t, index) => ({
                ...t,
                orden: index, // Asigna el índice como el nuevo orden
            }));

            // Actualiza el estado que se muestra en la tabla
            setTareasFiltradas(finalTareasConNuevoOrden);

            // 3. Preparar datos para la acción del servidor (solo IDs y orden 0-based)
            const ordenData: OrdenarTareasInput = finalTareasConNuevoOrden.map(({ id, orden }) => ({
                id,
                // Asegura que 'orden' sea un número; usa 0 si es null/undefined (aunque no debería serlo aquí)
                orden: orden ?? 0
            }));

            // 4. Llamar a la acción para persistir el orden en la BD
            setIsSavingOrder(true);
            setError(null); // Limpiar errores previos
            try {
                const result = await actualizarOrdenTareas(ordenData); // Llama a la acción

                if (!result.success) {
                    // Si falla la acción, mostrar error y recargar TODO desde BD para asegurar consistencia
                    console.error('Error al guardar orden:', result.error);
                    setError('Error al guardar el nuevo orden. Recargando datos...');
                    await fetchData(); // Recarga todos los datos
                } else {
                    // Si la acción tiene éxito:
                    // Actualizar también el estado 'todasLasTareas' para mantener la consistencia
                    // si NO hay filtros activos. Esto evita una recarga completa innecesaria.
                    if (!filtroNombre && !filtroCategoriaId) {
                        // Es seguro actualizar 'todasLasTareas' directamente porque refleja 'tareasFiltradas'
                        setTodasLasTareas(finalTareasConNuevoOrden);
                    } else {
                        // Si hay filtros activos, es más seguro recargar todo desde la BD
                        // para asegurar que 'todasLasTareas' tenga el orden correcto globalmente.
                        await fetchData();
                    }
                    // Opcional: Mostrar un mensaje de éxito temporal si se desea
                }
            } catch (saveError: unknown) {
                // Captura errores de red o excepciones al llamar la acción
                console.error('Error crítico al llamar actualizarOrdenTareas:', saveError);
                setError('Error crítico al guardar el orden. Recargando datos...');
                await fetchData(); // Recarga todos los datos como fallback
            } finally {
                setIsSavingOrder(false); // Quita el indicador de guardado
            }
        }
    }, [tareasFiltradas, filtroNombre, filtroCategoriaId, fetchData]); // Dependencias del useCallback

    // --- Navegación ---
    const handleRowClick = (tareaId: string) => {
        router.push(`/admin/tareas/${tareaId}`); // Ajusta la ruta si es necesario
    };

    // --- Renderizado ---
    return (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full">
            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-zinc-700 pb-3">
                <h3 className="text-base font-semibold text-white whitespace-nowrap">Marketplace de Tareas</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Indicador de guardado de orden */}
                    {isSavingOrder && (
                        <span className='text-xs text-blue-400 flex items-center gap-1 animate-pulse'>
                            <Loader2 size={12} className='animate-spin' /> Guardando orden...
                        </span>
                    )}
                    {/* Botón Nueva Tarea */}
                    <Link href="/admin/tareas/nueva" className={`${primaryButtonClasses} !px-2.5 !py-1.5 !text-xs w-full sm:w-auto justify-center`}>
                        <PlusIcon size={14} /> Nueva Tarea
                    </Link>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-4 space-y-3">
                {/* Búsqueda por nombre */}
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={filtroNombre}
                        onChange={(e) => setFiltroNombre(e.target.value)}
                        className={`${inputBaseClasses} pl-7`}
                        disabled={loading} // Deshabilitar mientras carga
                    />
                </div>
                {/* Filtro por Categorías */}
                <div>
                    <label className="text-xs font-medium text-zinc-400 block mb-1.5">Filtrar por Categoría:</label>
                    <div className="flex flex-wrap gap-1.5">
                        {/* Botón "Todas" */}
                        <button
                            onClick={() => setFiltroCategoriaId('')}
                            className={`${categoryButtonBase} ${!filtroCategoriaId ? categoryButtonActive : categoryButtonInactive}`}
                            disabled={loading}
                        >
                            {!filtroCategoriaId && <Check size={12} className="-ml-0.5" />} Todas
                        </button>
                        {/* Botones por cada categoría */}
                        {categorias.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFiltroCategoriaId(cat.id)}
                                className={`${categoryButtonBase} ${filtroCategoriaId === cat.id ? categoryButtonActive : categoryButtonInactive}`}
                                disabled={loading}
                            // Opcional: Añadir color al botón si se desea
                            // style={filtroCategoriaId !== cat.id && cat.color ? { borderColor: cat.color, color: cat.color } : {}}
                            >
                                {filtroCategoriaId === cat.id && <Check size={12} className="-ml-0.5" />} {cat.nombre}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mensaje de Error General */}
            {error && !loading && (
                <p className="mb-3 text-center text-xs text-red-400 bg-red-900/30 p-1.5 rounded border border-red-600">
                    {error}
                </p>
            )}

            {/* Tabla de Tareas (Contenedor Scrollable y DnD Context) */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {/* Contenedor con overflow y estilos */}
                <div className="flex-grow overflow-auto -mx-4 -mb-4 border border-zinc-700 bg-zinc-900/30">
                    {/* Estado de Carga */}
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400 h-60">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span>Cargando tareas...</span>
                        </div>
                    ) : (
                        /* Tabla Principal */
                        <table className="min-w-full divide-y divide-zinc-700/50">
                            {/* Cabecera Fija */}
                            <thead className="bg-zinc-800 sticky top-0 z-10">
                                <tr>
                                    {/* Columnas de la tabla */}
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-10" aria-label="Mover"></th>{/* Handle */}
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Icono">I</th>
                                    <th scope="col" className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-8" title="Galería">G</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Nombre Tarea</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Categoría</th>
                                    <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Etiquetas</th>
                                    <th scope="col" className="px-2 py-2 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider w-16">Precio</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-16" title="Ejecuciones">Ejec.</th>
                                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider w-20">Status</th>
                                </tr>
                            </thead>
                            {/* Cuerpo de la tabla con contexto para DnD */}
                            <SortableContext items={tareasFiltradas.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <tbody className="divide-y divide-zinc-800">
                                    {/* Mensaje si no hay tareas filtradas */}
                                    {tareasFiltradas.length === 0 && !error ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-10 text-sm text-zinc-500 italic">
                                                <ListFilter className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
                                                No se encontraron tareas con los filtros aplicados.
                                            </td>
                                        </tr>
                                    ) : (
                                        /* Mapeo de tareas filtradas a filas sorteables */
                                        tareasFiltradas.map((tarea) => (
                                            <SortableTableRow key={tarea.id} id={tarea.id} tarea={tarea} onRowClick={handleRowClick} />
                                        ))
                                    )}
                                </tbody>
                            </SortableContext>
                        </table>
                    )}
                    {/* Mensaje de ayuda para reordenar */}
                    {!loading && todasLasTareas.length > 0 && tareasFiltradas.length > 0 && (
                        <p className="text-xs text-center text-zinc-500 mt-3 px-4 pb-2 italic">
                            Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-1 mx-0.5' /> para reordenar.
                        </p>
                    )}
                </div>
            </DndContext>
        </div>
    );
}
