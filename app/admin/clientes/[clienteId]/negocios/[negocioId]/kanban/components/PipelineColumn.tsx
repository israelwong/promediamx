"use client";
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanBoardData } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import LeadCard from './LeadCard';

type Column = KanbanBoardData['columns'][0];

export default function PipelineColumn({ column }: { column: Column }) {
    const { setNodeRef } = useDroppable({ id: column.id });

    return (
        <div
            ref={setNodeRef}
            className="w-72 md:w-80 flex-shrink-0 bg-zinc-800 rounded-lg p-2"
        >
            <div className="p-2 mb-2 sticky top-0 bg-zinc-800 z-10">
                <h3 className="text-base font-semibold text-zinc-200 flex items-center justify-between">
                    {column.nombre}
                    <span className="text-sm font-normal text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-full">
                        {column.leads.length}
                    </span>
                </h3>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] p-1 custom-scrollbar">
                <SortableContext items={column.leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
                    {column.leads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                </SortableContext>
                {column.leads.length === 0 && (
                    <div className="text-center text-sm text-zinc-500 py-10 px-4 border-2 border-dashed border-zinc-700 rounded-lg">
                        Arrastra un lead aquí.
                    </div>
                )}
            </div>
        </div>
    );
}