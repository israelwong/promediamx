// 'use client';

// import React, { useEffect, useState, useCallback } from 'react';
// import { useRouter } from 'next/navigation';
// // --- DnD Imports ---
// import {
//     DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
// } from '@dnd-kit/core';
// import {
//     arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
// } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';
// // --- Fin DnD Imports ---

// // Mantener las importaciones de actions originales
// import {
//     obtenerFuncionesTareaConParametros,
//     eliminarFuncionTarea,
//     actualizarOrdenFunciones,
// } from '@/app/admin/_lib/tareaFuncion.actions';

// // --- IMPORTACIONES DE TIPOS ACTUALIZADAS ---
// import {
//     FuncionConDetalles,
// } from '@/app/admin/_lib/tareaFuncion.type';


// import {
//     Loader2,
//     ListChecks,
//     Trash2,
//     Cog,
//     GripVertical,
//     PlusIcon, // Icono para el nuevo botón
//     AlertTriangleIcon,
//     Edit
// } from 'lucide-react';

// // --- Componente SortableFuncionItem (Lógica original) ---
// function SortableFuncionItem({ id, funcion, onDelete }: { id: string; funcion: FuncionConDetalles; onDelete: (id: string, nombre: string) => void }) {
//     const {
//         attributes, listeners, setNodeRef, transform, transition, isDragging,
//     } = useSortable({ id: id });

//     const style = {
//         transform: CSS.Transform.toString(transform),
//         transition,
//         opacity: isDragging ? 0.7 : 1,
//         zIndex: isDragging ? 10 : undefined,
//     };

//     const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start justify-between gap-3";
//     const buttonDeleteClasses = "text-red-500 hover:text-red-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:hover:bg-transparent";
//     const paramTagClasses = "text-[0.7rem] px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap";

//     const canDelete = (funcion._count?.tareas ?? 0) === 0;

//     const router = useRouter();
//     const handleEditarFuncion = (id: string) => {
//         // Aquí iría la lógica para editar la función
//         // Por ejemplo, redirigir a una página de edición
//         router.push(`/admin/tareas/funciones/${id}`);
//     };

//     return (
//         <li ref={setNodeRef} style={style} className={`${listItemClasses} ${isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}>
//             <button
//                 {...attributes} {...listeners}
//                 className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 self-center mr-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
//                 aria-label="Arrastrar para reordenar"
//             >
//                 <GripVertical size={16} />
//             </button>
//             <div className="flex-grow mr-2 overflow-hidden">
//                 <p className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-1.5" title={funcion.nombreVisible}>
//                     {funcion.nombreVisible}
//                     <span className="text-xs text-zinc-500 font-mono">({funcion.nombreInterno})</span>
//                 </p>
//                 {funcion.descripcion && <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5" title={funcion.descripcion}>{funcion.descripcion}</p>}
//                 {funcion.parametrosRequeridos && funcion.parametrosRequeridos.length > 0 && (
//                     <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
//                         <span className="text-xs text-zinc-500 mr-1">Params:</span>
//                         {funcion.parametrosRequeridos.map(({ parametroRequerido, esObligatorio }) => parametroRequerido ? (
//                             <span key={parametroRequerido.id} className={paramTagClasses} title={`ID: ${parametroRequerido.nombreInterno} | Tipo: ${parametroRequerido.tipoDato}${esObligatorio ? ' (Obligatorio)' : ''}`}>
//                                 {parametroRequerido.nombreVisible}
//                                 {esObligatorio && <span className="text-amber-400 ml-0.5">*</span>}
//                             </span>
//                         ) : null)}
//                     </div>
//                 )}
//                 {(!funcion.parametrosRequeridos || funcion.parametrosRequeridos.length === 0) && (
//                     <p className="text-xs text-zinc-500 italic mt-1.5">Sin parámetros estándar asociados.</p>
//                 )}
//             </div>
//             <div className="flex items-center gap-3 flex-shrink-0 self-center">
//                 <span
//                     className={`text-xs ${canDelete ? 'text-green-400' : 'text-zinc-500'}`}
//                     title={`${funcion._count?.tareas ?? 0} tarea(s) usan esta función`}
//                 >
//                     {funcion._count?.tareas ?? 0} Tareas
//                 </span>
//                 <button
//                     onClick={() => onDelete(funcion.id, funcion.nombreVisible)}
//                     className={buttonDeleteClasses}
//                     disabled={!canDelete}
//                     title={canDelete ? "Eliminar esta función (no está en uso)" : "No se puede eliminar: función en uso por tareas"}
//                 >
//                     <Trash2 size={16} />
//                 </button>

//                 <button
//                     onClick={() => handleEditarFuncion(funcion.id)}
//                     className="bg-blue-500 text-xs hover:text-blue-400 p-2 flex-shrink-0 rounded-md hover:bg-zinc-700 flex items-center gap-1"
//                     title="Editar esta función"
//                 >
//                     <Edit size={16} />
//                     <span>Editar</span>
//                 </button>
//             </div>
//         </li>
//     );
// }

// export default function TareaFunciones() {
//     const [funciones, setFunciones] = useState<FuncionConDetalles[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSavingOrder, setIsSavingOrder] = useState(false);
//     const [isDeleting, setIsDeleting] = useState<string | null>(null);
//     const router = useRouter();

//     // Clases de Tailwind según la Guía de Estilos
//     const containerClasses = "bg-zinc-800 rounded-lg shadow-md flex flex-col h-full"; // Asumiendo que el layout padre da padding
//     const headerSectionClasses = "flex items-center justify-between mb-4 border-b border-zinc-700 pb-3 px-4 pt-4";
//     const headerTitleClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
//     // Botón primario para "Crear Función"
//     const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50";
//     const errorAlertClasses = "mb-3 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 mx-4 flex items-center gap-2";
//     const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2 px-4 pb-4"; // Añadido padding inferior y horizontal

//     // Lógica de fetchData (original del usuario)
//     const fetchData = useCallback(async (isInitialLoad = false) => {
//         if (isInitialLoad) setLoading(true);
//         setError(null);
//         try {
//             // La action original devuelve un tipo complejo, casteamos a FuncionConDetalles[]
//             const funcionesData = await obtenerFuncionesTareaConParametros() as FuncionConDetalles[];
//             setFunciones((funcionesData || []).map((f, index) => ({
//                 ...f,
//                 orden: f.orden ?? index,
//                 // Asegurar que _count exista para la UI, incluso si la action no lo devuelve siempre
//                 _count: f._count || { tareas: 0 }
//             })));
//         } catch (err) {
//             console.error("Error al obtener datos:", err);
//             setError("No se pudieron cargar las funciones.");
//             setFunciones([]);
//         } finally {
//             if (isInitialLoad) setLoading(false);
//         }
//     }, []);

//     useEffect(() => { fetchData(true); }, [fetchData]);

//     // Lógica de handleDeleteFuncion (original del usuario)
//     const handleDeleteFuncion = async (id: string, nombre: string) => {
//         if (isDeleting) return;

//         if (confirm(`¿Estás seguro de eliminar la función "${nombre}"?\nEsta acción es irreversible.`)) {
//             setIsDeleting(id);
//             setError(null);
//             try {
//                 const result = await eliminarFuncionTarea(id);
//                 if (result?.success) {
//                     setFunciones(prev => prev.filter(f => f.id !== id));
//                 } else {
//                     throw new Error(result?.error || "Error desconocido al eliminar.");
//                 }
//             } catch (err) {
//                 console.error("Error eliminando función:", err);
//                 setError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
//             } finally {
//                 setIsDeleting(null);
//             }
//         }
//     };

//     // Lógica de DnD (original del usuario)
//     const sensors = useSensors(
//         useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
//         useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
//     );

//     const handleDragEnd = async (event: DragEndEvent) => {
//         const { active, over } = event;
//         if (active.id !== over?.id && over) {
//             const oldIndex = funciones.findIndex((f) => f.id === active.id);
//             const newIndex = funciones.findIndex((f) => f.id === over.id);
//             if (oldIndex === -1 || newIndex === -1) return;

//             const reorderedFunciones = arrayMove(funciones, oldIndex, newIndex);
//             const finalOrder = reorderedFunciones.map((func, index) => ({ ...func, orden: index }));
//             setFunciones(finalOrder);

//             const funcionesParaActualizar = finalOrder.map(({ id, orden }) => ({ id, orden: orden as number }));

//             setIsSavingOrder(true); setError(null);
//             try {
//                 const result = await actualizarOrdenFunciones(funcionesParaActualizar);
//                 if (!result.success) {
//                     setError(result.error || "Error al guardar el orden.");
//                     fetchData();
//                 }
//             } catch (err) {
//                 setError(`Error al guardar orden: ${err instanceof Error ? err.message : 'Error desconocido'}`);
//                 fetchData();
//             } finally { setIsSavingOrder(false); }
//         }
//     };

//     // Lógica para crear una nueva función (placeholder)
//     const handleCrearFuncion = () => {
//         // Aquí iría la lógica para crear una nueva función
//         router.push('/admin/tareas/funciones/nueva'); // Redirigir a la página de creación
//     };

//     // --- Renderizado ---
//     return (
//         <div className={containerClasses}>
//             {/* Cabecera de Sección con nuevo botón */}
//             <div className={headerSectionClasses}>
//                 <h2 className={headerTitleClasses}>
//                     <Cog size={20} /> {/* Icono ajustado */}
//                     Funciones Globales
//                 </h2>
//                 <div className="flex items-center gap-3">
//                     {isSavingOrder && <span className='text-xs text-blue-400 flex items-center gap-1'><Loader2 size={12} className='animate-spin' /> Guardando orden...</span>}
//                     {/* --- NUEVO BOTÓN "CREAR FUNCIÓN" --- */}
//                     <button
//                         onClick={() => {
//                             handleCrearFuncion(); // Lógica para crear una nueva función
//                         }}
//                         className={buttonPrimaryClasses}
//                         title="Crear una nueva función global para tareas"
//                     >
//                         <PlusIcon size={16} />
//                         <span>Crear Función</span>
//                     </button>
//                 </div>
//             </div>

//             {error && <p className={errorAlertClasses}><AlertTriangleIcon size={16} className="text-red-400" /> {error}</p>}

//             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
//                 <SortableContext items={funciones.map(f => f.id)} strategy={verticalListSortingStrategy}>
//                     <ul className={listContainerClasses}>
//                         {loading ? (
//                             <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando funciones...</span></div>
//                         ) : funciones.length === 0 && !error ? (
//                             <div className="flex flex-col items-center justify-center text-center py-10">
//                                 <ListChecks className="h-10 w-10 text-zinc-600 mb-3" />
//                                 <p className='text-zinc-400 italic text-sm'>No hay funciones globales definidas.</p>
//                                 <p className='text-xs text-zinc-500 mt-1'>Puedes crear una nueva función usando el botón de arriba.</p>
//                             </div>
//                         ) : (
//                             funciones.map((func) => (
//                                 <SortableFuncionItem
//                                     key={func.id}
//                                     id={func.id}
//                                     funcion={func}
//                                     onDelete={handleDeleteFuncion}
//                                 />
//                             ))
//                         )}
//                         {!loading && funciones.length > 0 && (
//                             <p className="text-xs text-center text-zinc-500 mt-3">
//                                 Arrastra <GripVertical size={12} className='inline align-text-bottom -mt-0.5 mx-0.5' /> para reordenar las funciones.
//                             </p>
//                         )}
//                     </ul>
//                 </SortableContext>
//             </DndContext>
//         </div>
//     );
// }
