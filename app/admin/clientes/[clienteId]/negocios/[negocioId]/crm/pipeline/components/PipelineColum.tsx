'use client';

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

// --- NUEVAS IMPORTS DE TIPOS/SCHEMAS ZOD ---
import type {
    PipelineColumnKanbanData, // Tipo para la columna completa
    LeadCardKanbanData         // Tipo para cada lead dentro de la columna
} from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas'; // Ajusta la ruta!

import LeadCard from './LeadCard'; // LeadCard ahora recibirá LeadCardKanbanData

interface Props {
    column: PipelineColumnKanbanData; // Usar el nuevo tipo Zod
    // Podrías pasar clienteId y negocioId si LeadCard los necesita para generar links, por ejemplo
    // clienteId: string;
    // negocioId: string;
}

export default function PipelineColumn({ column /*, clienteId, negocioId */ }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id, // ID de la columna (etapa del pipeline)
        data: {
            type: 'Column', // Tipo para identificarlo en dnd-kit
            columnId: column.id, // Pasar el ID de la columna en data puede ser útil
            // 'accepts' es un campo personalizado si tu lógica de drop lo usa.
            // dnd-kit se basa más en los tipos y IDs para la lógica de drop en handleDragEnd.
        },
    });

    // Clases de Tailwind (como las tenías, ajustadas para claridad)
    const columnWrapperClasses = `
        w-72 md:w-80 flex-shrink-0 h-full flex flex-col 
        rounded-lg border shadow-md transition-colors duration-150 ease-in-out
        ${isOver ? 'bg-sky-900/30 border-sky-500' : 'bg-zinc-800 border-zinc-700/80'}
    `;
    const headerClasses = "p-3 border-b flex justify-between items-center flex-shrink-0 select-none"; // select-none para evitar selección de texto al arrastrar
    const titleClasses = "text-sm font-semibold text-zinc-100 truncate";
    const leadCountClasses = "text-xs font-medium bg-zinc-700 text-zinc-300 rounded-full px-2 py-0.5";
    const listContainerClasses = "flex-grow p-2 space-y-2 overflow-y-auto min-h-[60px]"; // min-h para asegurar que sea un target de drop incluso vacío

    return (
        <div ref={setNodeRef} className={columnWrapperClasses}>
            {/* Encabezado de la Columna */}
            <div className={`${headerClasses} ${isOver ? 'border-sky-600' : 'border-zinc-700'}`}>
                <h3 className={titleClasses} title={column.nombre}>
                    {column.nombre}
                </h3>
                <span className={leadCountClasses}>
                    {column.leads.length}
                </span>
            </div>

            {/* Contenedor de Tarjetas (Leads) */}
            <div className={listContainerClasses}>
                {column.leads.length > 0 ? (
                    <SortableContext
                        items={column.leads.map(lead => lead.id)} // IDs de los leads en esta columna
                        strategy={verticalListSortingStrategy}
                    >
                        {column.leads.map((lead: LeadCardKanbanData) => ( // Tipar lead aquí
                            <LeadCard
                                key={lead.id}
                                lead={lead}
                                parentColumnId={column.id} // Pasar el ID de la columna padre a LeadCard
                            // clienteId={clienteId} // Pasar si LeadCard lo necesita
                            // negocioId={negocioId} // Pasar si LeadCard lo necesita
                            />
                        ))}
                    </SortableContext>
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-xs text-zinc-500 p-4 italic">
                        No hay leads en esta etapa.
                    </div>
                )}
            </div>
        </div>
    );
}