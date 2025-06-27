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

    // CORRECCIÓN CLAVE: Añadimos un estado para guardar manualmente la columna de origen.
    const [originalColumnId, setOriginalColumnId] = useState<string | null>(null);

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
            // CORRECCIÓN CLAVE: Al empezar a arrastrar, buscamos y guardamos el ID de la columna original.
            // Esto nos da una fuente de verdad confiable.
            const originColumn = boardData.columns.find(col => col.leads.some(l => l.id === active.id));
            if (originColumn) {
                setOriginalColumnId(originColumn.id);
            }
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveLead(null);
        setOriginalColumnId(null); // Limpiamos el estado al terminar.

        const { active, over } = event;

        if (!over) return;

        // CORRECCIÓN CLAVE: Usamos nuestro 'originalColumnId' del estado, no el de dnd-kit.
        const newColumnId = over.id as string;
        const leadId = active.id as string;
        const leadToMove = active.data.current?.lead as LeadInKanbanCard;

        if (!originalColumnId || !newColumnId || originalColumnId === newColumnId) {
            return;
        }

        // La lógica de actualización optimista ahora funcionará porque tiene los IDs correctos.
        setBoardData(prevData => {
            const newColumns = prevData.columns.map(col => {
                if (col.id === originalColumnId) {
                    return { ...col, leads: col.leads.filter(l => l.id !== leadId) };
                }
                if (col.id === newColumnId) {
                    return { ...col, leads: [leadToMove, ...col.leads] };
                }
                return col;
            });
            return { ...prevData, columns: newColumns };
        });

        toast.promise(
            actualizarEtapaLeadEnPipelineAction({ leadId, nuevoPipelineId: newColumnId }),
            {
                loading: 'Moviendo lead...',
                success: '¡Etapa actualizada!',
                error: (err) => {
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