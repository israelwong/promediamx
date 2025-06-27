"use client";

import React, { useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import { actualizarEtapaLeadEnPipelineAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import toast from 'react-hot-toast';

import PipelineColumn from './PipelineColumn';
import LeadCard from './LeadCard';

export default function PipelineKanbanBoard({ initialBoardData }: { initialBoardData: KanbanBoardData }) {
    const [boardData, setBoardData] = useState(initialBoardData);
    const [activeLead, setActiveLead] = useState<LeadInKanbanCard | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const lead = active.data.current?.lead as LeadInKanbanCard;
        if (lead) {
            setActiveLead(lead);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        const { active, over } = event;

        if (!over) return;

        const originalColumnId = active.data.current?.sortable.containerId;
        const newColumnId = over.id as string;
        const leadId = active.id as string;

        if (originalColumnId === newColumnId) {
            return; // No se hizo ningún cambio de columna
        }

        const leadToMove = active.data.current?.lead as LeadInKanbanCard;

        // --- Actualización Optimista de la UI ---
        setBoardData(prevData => {
            const newColumns = prevData.columns.map(col => {
                // Eliminar de la columna original
                if (col.id === originalColumnId) {
                    return { ...col, leads: col.leads.filter(l => l.id !== leadId) };
                }
                // Añadir a la nueva columna
                if (col.id === newColumnId) {
                    // Actualizamos el pipelineId del lead que movemos para consistencia
                    const updatedLeadToMove = { ...leadToMove, pipelineId: newColumnId };
                    return { ...col, leads: [updatedLeadToMove, ...col.leads] };
                }
                return col;
            });
            return { ...prevData, columns: newColumns };
        });

        // --- Llamada a la Server Action para persistir ---
        toast.promise(
            actualizarEtapaLeadEnPipelineAction({ leadId, nuevoPipelineId: newColumnId }),
            {
                loading: 'Moviendo lead...',
                success: '¡Etapa actualizada!',
                error: (err) => {
                    // En caso de error, revertimos al estado original
                    setBoardData(initialBoardData);
                    return `Error: ${err.message}`;
                },
            }
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {boardData.columns.map((column) => (
                    <PipelineColumn key={column.id} column={column} />
                ))}
            </div>
            <DragOverlay>
                {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}