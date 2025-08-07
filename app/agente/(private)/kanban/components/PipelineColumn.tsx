// RUTA: app/agente/kanban/components/PipelineColumn.tsx

import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo } from 'react';
import { KanbanColumn, LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';
import LeadCard from './LeadCard';
import { useDroppable } from '@dnd-kit/core';

function SortableLeadCard({ lead }: { lead: LeadInKanbanCard }) {
    // ... (este sub-componente no necesita cambios)
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lead.id,
        data: { type: 'Lead', lead },
    });
    const style = { transition, transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.5 : 1 };
    return <div ref={setNodeRef} style={style} {...attributes} {...listeners}><LeadCard lead={lead} /></div>;
}

export default function PipelineColumn({ column }: { column: KanbanColumn }) {
    const leadsIds = useMemo(() => column.leads.map((lead) => lead.id), [column.leads]);

    const { setNodeRef } = useDroppable({
        id: column.id,
        // --- MEJORA: Pasamos los datos de la columna para identificarla en el evento 'over' ---
        data: {
            type: 'Column',
            column: column
        }
    });

    return (
        <div className="w-80 flex-shrink-0">
            <div ref={setNodeRef} className="bg-zinc-900/70 rounded-lg flex flex-col gap-y-4 h-full max-h-[calc(100vh-12rem)]">
                {/* --- INICIO DE LA MODIFICACIÓN --- */}
                <div className="p-3 border-b border-zinc-700 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-100">{column.nombre}</h3>
                    {/* Añadimos un span para mostrar el conteo de leads */}
                    <span className="text-sm font-medium text-zinc-400 bg-zinc-800/80 h-6 w-6 flex items-center justify-center rounded-full">
                        {column.leads.length}
                    </span>
                </div>
                {/* --- FIN DE LA MODIFICACIÓN --- */}
                {/* --- MEJORA: Añadimos una altura mínima para que la zona de drop siempre exista --- */}
                <div className="flex-grow flex flex-col gap-y-2 overflow-y-auto px-2 min-h-[100px]">
                    <SortableContext items={leadsIds}>
                        {column.leads.map((lead) => (
                            <SortableLeadCard key={lead.id} lead={lead} />
                        ))}
                    </SortableContext>
                </div>
            </div>
        </div>
    );
}