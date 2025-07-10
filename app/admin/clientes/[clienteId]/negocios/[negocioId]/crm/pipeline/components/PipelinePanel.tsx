// // app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/pipeline/components/PipelinePanel.tsx
// 'use client';

// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//     DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
//     DragStartEvent, DragEndEvent, UniqueIdentifier, closestCorners, MeasuringStrategy
// } from '@dnd-kit/core';
// // SortableContext no se usa directamente si solo arrastras items entre columnas (droppables)
// // y no reordenas las columnas en sí. Si reordenas leads DENTRO de una columna, se usaría allí.

// // --- NUEVAS IMPORTS ---
// import {
//     obtenerDatosPipelineKanbanAction,
//     actualizarEtapaLeadEnPipelineAction
// } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
// import type {
//     KanbanBoardData,
//     LeadCardKanbanData, // Para el tipo de lead y el DragOverlay
//     // ActualizarEtapaLeadEnPipelineParams // El tipo se infiere en la llamada
// } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';

// // Componentes hijos (asegúrate que usen los nuevos tipos si es necesario)
// import PipelineColumn from './PipelineColum'; // Recibirá PipelineColumnKanbanData
// import LeadCard from './LeadCard';           // Recibirá LeadCardKanbanData

// import { Workflow, Users } from 'lucide-react';

// interface Props {
//     negocioId: string;
//     // clienteId y negocioId son pasados a las actions si son necesarios para revalidatePath
//     // Podrías obtenerlos de useParams() aquí si la ruta los tiene y la action los necesita.
// }

// export default function PipelinePanel({ negocioId }: Props) {
//     const [boardData, setBoardData] = useState<KanbanBoardData | null>(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [activeDragItemId, setActiveDragItemId] = useState<UniqueIdentifier | null>(null);
//     // activeDragItemType ya no es tan necesario si solo arrastramos Leads

//     const fetchBoardData = useCallback(async (isInitialLoad = true) => {
//         if (isInitialLoad) setLoading(true);
//         setError(null);
//         try {
//             const result = await obtenerDatosPipelineKanbanAction({ negocioId }); // Nueva Action
//             if (result.success && result.data) {
//                 setBoardData(result.data);
//                 if (!result.data.crmId && result.data.columns.length === 0 && isInitialLoad) {
//                     setError("El CRM no está configurado o no tiene etapas de pipeline definidas.");
//                 }
//             } else {
//                 throw new Error(result.error || "Error cargando datos del pipeline.");
//             }
//         } catch (err) {
//             setError(`No se pudo cargar el tablero: ${err instanceof Error ? err.message : "Error"}`);
//             if (isInitialLoad) setBoardData(null);
//         } finally {
//             if (isInitialLoad) setLoading(false);
//         }
//     }, [negocioId]);

//     useEffect(() => {
//         fetchBoardData(true);
//     }, [fetchBoardData]);

//     const sensors = useSensors(
//         useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
//     );

//     const handleDragStart = (event: DragStartEvent) => {
//         const { active } = event;
//         // Asumimos que solo los LeadCards son arrastrables por ahora
//         // y que active.data.current.type === 'LeadCard' o similar se establece en LeadCard
//         if (active.data.current?.type === 'LeadCard') { // Asegúrate que LeadCard pase este data
//             setActiveDragItemId(active.id);
//         }
//     };

//     const handleDragEnd = async (event: DragEndEvent) => {
//         const { active, over } = event;
//         setActiveDragItemId(null); // Limpiar el item arrastrado

//         if (!over) return; // No se soltó sobre un destino válido

//         const leadId = active.id as string;
//         const oldColumnId = active.data.current?.parentColumnId as string; // LeadCard debe proveer esto

//         // 'over.id' puede ser el ID de la columna o el ID de otra tarjeta Lead
//         // Necesitamos el ID de la columna de destino (droppable)
//         const newColumnId = over.data.current?.type === 'Column'
//             ? over.id as string
//             : over.data.current?.parentColumnId as string;

//         if (!newColumnId || newColumnId === oldColumnId) {
//             // Si se soltó en la misma columna (o no es una columna válida), 
//             // aquí podrías manejar el reordenamiento DENTRO de la columna si lo implementas.
//             // Por ahora, solo manejamos el cambio entre columnas.
//             console.log("Movimiento dentro de la misma columna o destino inválido, no se actualiza etapa.");
//             return;
//         }

//         // Actualización Optimista de la UI
//         setBoardData((prevBoard) => {
//             if (!prevBoard) return null;
//             let leadToMove: LeadCardKanbanData | undefined;
//             const columnsWithLeadRemoved = prevBoard.columns.map(column => {
//                 if (column.id === oldColumnId) {
//                     const leadIndex = column.leads.findIndex(l => l.id === leadId);
//                     if (leadIndex > -1) {
//                         leadToMove = column.leads[leadIndex];
//                         return { ...column, leads: column.leads.filter(l => l.id !== leadId) };
//                     }
//                 }
//                 return column;
//             });

//             if (!leadToMove) return prevBoard; // No se encontró el lead para mover

//             const columnsWithLeadAdded = columnsWithLeadRemoved.map(column => {
//                 if (column.id === newColumnId) {
//                     // Añadir al principio o al final, o en una posición específica si la calculas
//                     const updatedLead = { ...leadToMove!, pipelineId: newColumnId };
//                     return { ...column, leads: [updatedLead, ...column.leads] }; // Añadir al principio
//                 }
//                 return column;
//             });
//             return { ...prevBoard, columns: columnsWithLeadAdded };
//         });

//         // Llamada a Server Action para persistir el cambio
//         try {
//             const result = await actualizarEtapaLeadEnPipelineAction({ leadId, nuevoPipelineId: newColumnId });
//             if (!result.success) {
//                 throw new Error(result.error || "Error al actualizar etapa en servidor.");
//             }
//             // Opcional: Pequeña notificación de éxito
//             console.log(`Lead ${leadId} movido a etapa ${newColumnId} exitosamente.`);
//             // No es estrictamente necesario llamar a fetchBoardData() si la UI optimista es suficiente
//             // y confías en que el servidor procesó bien. Para consistencia total, podrías refetchear.
//             // await fetchBoardData(false); 
//         } catch (updateError) {
//             setError(`Error al guardar: ${updateError instanceof Error ? updateError.message : "Error"}. Restaurando...`);
//             await fetchBoardData(false); // Revertir a los datos del servidor en caso de error
//         }
//     };

//     const totalLeads = useMemo(() => {
//         return boardData?.columns.reduce((sum, column) => sum + column.leads.length, 0) ?? 0;
//     }, [boardData]);

//     // Obtener los datos del Lead que se está arrastrando para el DragOverlay
//     const draggedLeadData = useMemo(() => {
//         if (!activeDragItemId || !boardData) return null;
//         for (const column of boardData.columns) {
//             const found = column.leads.find(lead => lead.id === activeDragItemId);
//             if (found) return found;
//         }
//         return null;
//     }, [activeDragItemId, boardData]);

//     if (loading) { /* ... (igual) ... */ }
//     if (error && boardData?.crmId !== null) { /* ... (igual) ... */ }
//     if (!boardData?.crmId && !loading && !error) { /* ... (igual) ... */ }

//     return (
//         <div className="flex flex-col h-full">
//             <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-zinc-700 flex-shrink-0">
//                 <h2 className="text-xl font-semibold text-white flex items-center gap-2">
//                     <Workflow size={20} /> <span>Pipeline de Ventas</span>
//                 </h2>
//                 <div className="flex items-center gap-2 text-sm text-zinc-400">
//                     <Users size={16} /> <span>{totalLeads} Lead(s)</span>
//                 </div>
//             </div>

//             <div className="flex-1 overflow-x-auto overflow-y-hidden pb-3">
//                 <div className="flex h-full p-1 gap-4 w-max min-h-[calc(100%-1rem)]" style={{ minWidth: '100%' }}>
//                     {boardData && boardData.columns.length > 0 ? (
//                         <DndContext
//                             sensors={sensors}
//                             onDragStart={handleDragStart}
//                             onDragEnd={handleDragEnd}
//                             collisionDetection={closestCorners}
//                             measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
//                         >
//                             {/* No necesitas SortableContext aquí para las columnas si las columnas no son reordenables entre sí */}
//                             {/* Si las columnas fueran reordenables, aquí iría un SortableContext para ellas */}
//                             {boardData.columns.map(column => (
//                                 <PipelineColumn
//                                     key={column.id}
//                                     column={column}
//                                 // Pasar clienteId y negocioId si PipelineColumn los necesita para links a leads
//                                 />
//                             ))}
//                             <DragOverlay dropAnimation={null}>
//                                 {activeDragItemId && draggedLeadData ? (
//                                     <LeadCard lead={draggedLeadData} isOverlay />
//                                 ) : null}
//                             </DragOverlay>
//                         </DndContext>
//                     ) : !loading && boardData?.crmId ? (
//                         <div className="flex items-center justify-center w-full h-full text-zinc-500 italic">
//                             No hay etapas definidas en el pipeline. Configúralas primero.
//                         </div>
//                     ) : null}
//                 </div>
//             </div>
//         </div>
//     );
// }