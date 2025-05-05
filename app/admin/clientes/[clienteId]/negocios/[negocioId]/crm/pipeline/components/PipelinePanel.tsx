// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/pipeline/components/PipelinePanel.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Import useMemo
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    UniqueIdentifier,
    closestCorners,
} from '@dnd-kit/core';
import { SortableContext, } from '@dnd-kit/sortable';

// Importar acciones y tipos
import { obtenerDatosPipelineKanban, actualizarEtapaLead } from '@/app/admin/_lib/crmPipeline.actions'; // Ajusta ruta!
import { KanbanBoardData, } from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes hijos
import PipelineColumn from './PipelineColum';
import LeadCard from './LeadCard';

import { Loader2, AlertTriangle, Workflow, Users } from 'lucide-react'; // Añadido Users

interface Props {
    negocioId: string;
}

export default function PipelinePanel({ negocioId }: Props) {
    const [boardData, setBoardData] = useState<KanbanBoardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDragItemId, setActiveDragItemId] = useState<UniqueIdentifier | null>(null);
    const [activeDragItemType, setActiveDragItemType] = useState<'Lead' | null>(null);

    // --- Carga Inicial de Datos (sin cambios) ---
    const fetchBoardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await obtenerDatosPipelineKanban(negocioId);
            if (result.success && result.data) {
                setBoardData(result.data);
                if (!result.data.crmId) {
                    setError("El CRM no está configurado para este negocio.");
                    setBoardData({ crmId: null, columns: [] });
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar datos.");
            }
        } catch (err) {
            console.error("Error fetching Kanban data:", err);
            setError(`No se pudo cargar el tablero: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setBoardData(null);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchBoardData();
    }, [fetchBoardData]);

    // --- Lógica de Drag and Drop (sin cambios) ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );
    const handleDragStart = (event: DragStartEvent) => { /* ... */
        const { active } = event;
        if (active.data.current?.type === 'Lead') {
            setActiveDragItemId(active.id);
            setActiveDragItemType('Lead');
        }
    };
    const handleDragEnd = async (event: DragEndEvent) => { /* ... */
        setActiveDragItemId(null);
        setActiveDragItemType(null);
        const { active, over } = event;

        if (!over || active.id === over.id) {
            if (over && active.data.current?.parent !== over.data.current?.parent && active.data.current?.type === 'Lead') {
                // Continúa si se soltó en diferente columna
            } else {
                return; // No hubo cambio
            }
        }

        const isActiveALead = active.data.current?.type === 'Lead';
        const isOverAColumn = over.data.current?.type === 'Column';
        const isOverALead = over.data.current?.type === 'Lead';

        if (isActiveALead && (isOverAColumn || isOverALead)) {
            const leadId = active.id;
            const newColumnId = isOverAColumn ? over.id : over.data.current?.parent;
            const oldColumnId = active.data.current?.parent;

            if (!newColumnId || newColumnId === oldColumnId) { return; }

            // Actualización Optimista
            setBoardData((prevBoard) => {
                if (!prevBoard) return null;
                const activeColumnIndex = prevBoard.columns.findIndex(col => col.id === oldColumnId);
                const overColumnIndex = prevBoard.columns.findIndex(col => col.id === newColumnId);
                if (activeColumnIndex === -1 || overColumnIndex === -1) return prevBoard;
                const activeColumn = { ...prevBoard.columns[activeColumnIndex] };
                const overColumn = { ...prevBoard.columns[overColumnIndex] };
                const leadIndex = activeColumn.leads.findIndex(lead => lead.id === leadId);
                if (leadIndex === -1) return prevBoard;
                const [movedLead] = activeColumn.leads.splice(leadIndex, 1);
                const updatedLead = { ...movedLead, pipelineId: newColumnId as string };
                overColumn.leads.push(updatedLead);
                const newColumns = [...prevBoard.columns];
                newColumns[activeColumnIndex] = activeColumn;
                newColumns[overColumnIndex] = overColumn;
                return { ...prevBoard, columns: newColumns };
            });

            // Llamada a Server Action
            try {
                const result = await actualizarEtapaLead(leadId as string, newColumnId as string);
                if (!result.success) { throw new Error(result.error || "Error al actualizar etapa en servidor."); }
                console.log(`Lead ${leadId} movido a etapa ${newColumnId} exitosamente.`);
            } catch (updateError) {
                console.error("Error updating lead stage:", updateError);
                setError(`Error al guardar cambio: ${updateError instanceof Error ? updateError.message : "Error desconocido"}. Reintentando carga...`);
                await fetchBoardData(); // Revertir
            }
        }
    };

    // --- Calcular Total de Leads ---
    const totalLeads = useMemo(() => {
        return boardData?.columns.reduce((sum, column) => sum + column.leads.length, 0) ?? 0;
    }, [boardData]);

    // --- Renderizado ---
    if (loading) {
        return <div className="flex items-center justify-center h-full text-zinc-400"><Loader2 className="h-8 w-8 animate-spin mr-3" />Cargando Pipeline...</div>;
    }

    if (error && boardData?.crmId !== null) {
        return <div className="flex flex-col items-center justify-center h-full text-red-500"><AlertTriangle className="h-8 w-8 mb-2" />{error}</div>;
    }

    if (!boardData?.crmId && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-zinc-400">
                <Workflow className="h-12 w-12 mb-4 text-zinc-600" />
                <h3 className="text-lg font-semibold text-zinc-300 mb-2">CRM No Configurado</h3>
                <p className="text-sm">Parece que el CRM aún no ha sido inicializado para este negocio.</p>
                <p className="text-sm mt-1">Puedes configurarlo desde el panel principal del negocio.</p>
            </div>
        );
    }

    const draggedLead = activeDragItemId && activeDragItemType === 'Lead'
        ? boardData?.columns.flatMap(col => col.leads).find(lead => lead.id === activeDragItemId)
        : null;

    return (
        // Div exterior para ocupar espacio y altura, flex vertical
        <div className="flex flex-col h-full shadow-sm">
            {/* --- NUEVO: Encabezado del Panel --- */}
            <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-zinc-700 flex-shrink-0">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Workflow size={20} />
                    <span>Pipeline</span>
                </h2>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Users size={16} />
                    <span>{totalLeads} Lead(s)</span>
                </div>
            </div>
            {/* --- FIN Encabezado --- */}

            {/* Div interior para manejar el scroll horizontal */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 "> {/* pb-2 para espacio scrollbar */}
                {/* Div para alinear las columnas con flex y gap */}
                <div className="flex h-full p-1 gap-4 w-max"> {/* w-max para que se expanda con el contenido */}
                    {boardData && boardData.columns.length > 0 ? (
                        <DndContext
                            sensors={sensors}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            collisionDetection={closestCorners}
                        >
                            <SortableContext items={boardData.columns.map(col => col.id)}>
                                {boardData.columns.map(column => (
                                    <PipelineColumn key={column.id} column={column} />
                                ))}
                            </SortableContext>
                            <DragOverlay>
                                {activeDragItemId && activeDragItemType === 'Lead' && draggedLead ? (
                                    <LeadCard lead={draggedLead} isOverlay />
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-zinc-500 italic">
                            No hay etapas definidas en el pipeline. Configúralas primero.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
