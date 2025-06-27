"use client";

import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import { actualizarEtapaLeadEnPipelineAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import toast from 'react-hot-toast';

import PipelineColumn from './PipelineColumn';
import LeadCard from './LeadCard';

interface PipelineKanbanBoardProps {
    boardData: KanbanBoardData;
    onBoardChange: (newData: KanbanBoardData) => void;
    clienteId: string;
    negocioId: string;
}

export default function PipelineKanbanBoard({ boardData, onBoardChange, clienteId, negocioId }: PipelineKanbanBoardProps) {
    const [activeLead, setActiveLead] = useState<LeadInKanbanCard | null>(null);
    const [originalColumnId, setOriginalColumnId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const lead = active.data.current?.lead as LeadInKanbanCard;
        if (lead) {
            setActiveLead(lead);
            const originColumn = boardData.columns.find(col => col.leads.some(l => l.id === active.id));
            if (originColumn) {
                setOriginalColumnId(originColumn.id);
            }
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        setOriginalColumnId(null);

        const { active, over } = event;
        if (!over) return;

        const newColumnId = over.id as string;
        const leadId = active.id as string;

        if (!originalColumnId || !newColumnId || originalColumnId === newColumnId) {
            return;
        }

        const leadToMove = boardData.columns
            .find(col => col.id === originalColumnId)?.leads
            .find(l => l.id === leadId);

        if (!leadToMove) return;

        // Calculamos el nuevo estado y se lo notificamos al padre
        const newColumns = boardData.columns.map(col => {
            if (col.id === originalColumnId) {
                return { ...col, leads: col.leads.filter(l => l.id !== leadId) };
            }
            if (col.id === newColumnId) {
                return { ...col, leads: [leadToMove, ...col.leads] };
            }
            return col;
        });
        onBoardChange({ ...boardData, columns: newColumns });

        toast.promise(
            actualizarEtapaLeadEnPipelineAction({ leadId, nuevoPipelineId: newColumnId, clienteId, negocioId }),
            {
                loading: 'Moviendo lead...',
                success: '¡Etapa actualizada!',
                error: (err) => `Error: ${err.message}`,
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