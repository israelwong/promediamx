'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanBoardData, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import { actualizarEtapaLeadEnPipelineAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions'; // O la acción del agente
import toast from 'react-hot-toast';

import CitaModal from '../../leads/components/CitaModal';

import PipelineColumn from './PipelineColumn';
import LeadCard from './LeadCard';

interface PipelineKanbanBoardProps {
    initialBoardData: KanbanBoardData;
    negocioId: string;
    clienteId: string;
}

export default function PipelineKanbanBoard({ initialBoardData, negocioId, clienteId }: PipelineKanbanBoardProps) {
    const [boardData, setBoardData] = useState<KanbanBoardData>(initialBoardData);
    const [activeLead, setActiveLead] = useState<LeadInKanbanCard | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => { setBoardData(initialBoardData); }, [initialBoardData]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Lead') {
            setActiveLead(event.active.data.current.lead as LeadInKanbanCard);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveLead(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const sourceColumn = boardData.columns.find(col => col.leads.some(lead => lead.id === active.id));
        let destinationColumn = boardData.columns.find(col => col.id === over.id);
        if (!destinationColumn) {
            destinationColumn = boardData.columns.find(col => col.leads.some(lead => lead.id === over.id));
        }

        if (!sourceColumn || !destinationColumn) return;

        const leadId = active.id as string;
        const sourceColumnId = sourceColumn.id;
        const destinationColumnId = destinationColumn.id;

        const originalBoardData = JSON.parse(JSON.stringify(boardData));

        setBoardData(currentBoardData => {
            const newColumns = currentBoardData.columns.map(col => ({ ...col, leads: [...col.leads] }));
            const sourceCol = newColumns.find(col => col.id === sourceColumnId)!;
            const destCol = newColumns.find(col => col.id === destinationColumnId)!;
            const sourceLeadIndex = sourceCol.leads.findIndex(lead => lead.id === leadId);
            const [movedLead] = sourceCol.leads.splice(sourceLeadIndex, 1);
            movedLead.pipelineId = destCol.id;
            const overLeadIndex = destCol.leads.findIndex(lead => lead.id === over.id);
            const newIndex = overLeadIndex !== -1 ? overLeadIndex : destCol.leads.length;
            destCol.leads.splice(newIndex, 0, movedLead);
            return { columns: newColumns };
        });

        if (sourceColumnId !== destinationColumnId) {
            toast.promise(
                actualizarEtapaLeadEnPipelineAction({ leadId, nuevoPipelineId: destinationColumnId, negocioId, clienteId }),
                {
                    loading: 'Moviendo prospecto...',
                    success: (result) => { if (result.success) { router.refresh(); return '¡Etapa actualizada!'; } else { throw new Error(result.error); } },
                    error: (err) => { setBoardData(originalBoardData); return `Error: ${err.message}`; },
                }
            );
        }
    };

    if (!isMounted) return null;

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar h-full">
                    {boardData.columns.map((column) => (
                        <PipelineColumn key={column.id} column={column} />
                    ))}
                </div>
                <DragOverlay>
                    {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
                </DragOverlay>
            </DndContext>

            <CitaModal negocioId={negocioId} clienteId={clienteId} />
        </>);
}