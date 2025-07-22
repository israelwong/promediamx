/* RUTA: app/admin/.../kanban/components/PipelineKanbanBoard.tsx (CORREGIDO) */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
// ✅ ¡Importante! Añadir 'arrayMove' para reordenar fácilmente
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import { actualizarEtapaLeadEnPipelineAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import toast from 'react-hot-toast';

import PipelineColumn from './PipelineColumn';
import LeadCard from './LeadCard';

interface PipelineKanbanBoardProps {
    boardData: KanbanBoardData;
    onBoardChange: (newData: KanbanBoardData) => void;
    negocioId: string;
    // ✅ Añadimos clienteId para pasarlo a la server action
    clienteId: string;
}

// ✅ Añadimos clienteId a las props
export default function PipelineKanbanBoard({ boardData, onBoardChange, negocioId, clienteId }: PipelineKanbanBoardProps) {
    const [activeLead, setActiveLead] = useState<LeadInKanbanCard | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // El usuario debe arrastrar 8px para iniciar el drag
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function findColumn(id: string) {
        return boardData.columns.find(col => col.leads.some(lead => lead.id === id) || col.id === id);
    }

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        if (active.data.current?.lead) {
            setActiveLead(active.data.current.lead as LeadInKanbanCard);
        }
    }

    // 🔥 =============================================================
    // 🔥 FUNCIÓN CORREGIDA Y REFACTORIZADA
    // 🔥 =============================================================
    function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        const { active, over } = event;

        if (!over) return;

        // 1. Identificar columnas de origen y destino
        const sourceColumn = findColumn(active.id as string);
        const destinationColumn = findColumn(over.id as string);

        if (!sourceColumn || !destinationColumn) return;

        const sourceColumnId = sourceColumn.id;
        const destinationColumnId = destinationColumn.id;
        const leadId = active.id as string;

        // 2. Manejar el reordenamiento DENTRO de la misma columna
        if (sourceColumnId === destinationColumnId) {
            const activeIndex = sourceColumn.leads.findIndex(l => l.id === active.id);
            const overIndex = destinationColumn.leads.findIndex(l => l.id === over.id);

            if (activeIndex !== overIndex) {
                const newColumns = boardData.columns.map(col => {
                    if (col.id === sourceColumnId) {
                        return { ...col, leads: arrayMove(col.leads, activeIndex, overIndex) };
                    }
                    return col;
                });
                onBoardChange({ ...boardData, columns: newColumns });
            }
            // No se necesita llamada al backend para reordenar (a menos que guardes el orden de leads)
            return;
        }

        // 3. Manejar el movimiento ENTRE columnas (con actualización optimista)
        const originalBoardData = JSON.parse(JSON.stringify(boardData)); // Copia profunda para revertir si falla
        const leadToMove = sourceColumn.leads.find(l => l.id === leadId);

        if (!leadToMove) return;

        // Actualización optimista de la UI
        const newBoardData = { ...boardData };
        const sourceLeads = newBoardData.columns.find(c => c.id === sourceColumnId)!.leads;
        const destLeads = newBoardData.columns.find(c => c.id === destinationColumnId)!.leads;

        const sourceLeadIndex = sourceLeads.findIndex(l => l.id === leadId);
        sourceLeads.splice(sourceLeadIndex, 1);

        const destLeadIndex = destLeads.findIndex(l => l.id === over.id);
        const newIndex = destLeadIndex > -1 ? destLeadIndex : destLeads.length;
        destLeads.splice(newIndex, 0, leadToMove);

        onBoardChange(newBoardData);

        // 4. Llamar a la Server Action
        toast.promise(
            actualizarEtapaLeadEnPipelineAction({
                leadId,
                nuevoPipelineId: destinationColumnId,
                negocioId,
                clienteId, // ✅ Pasar el clienteId
            }),
            {
                loading: 'Moviendo lead...',
                success: (result) => {
                    if (result.success) {
                        router.refresh(); // Refresca los datos desde el servidor para consistencia
                        return '¡Etapa actualizada!';
                    } else {
                        throw new Error(result.error || "Error desconocido");
                    }
                },
                error: (err) => {
                    onBoardChange(originalBoardData); // ⏪ Revertir en caso de error
                    return `Error: ${err.message}`;
                },
            }
        );
    }

    if (!isMounted) {
        // Evita renderizado en servidor que cause mismatch en hidratación
        return null;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-full">
                {boardData.columns.map((column) => (
                    // El SortableContext debe estar aquí, envolviendo las tarjetas
                    <PipelineColumn key={column.id} column={column} />
                ))}
            </div>
            <DragOverlay>
                {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}