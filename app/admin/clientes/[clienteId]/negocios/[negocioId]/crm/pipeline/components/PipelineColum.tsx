// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/pipeline/components/PipelineColumn.tsx
'use client';

import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { PipelineColumnData } from '@/app/admin/_lib/types'; // Ajusta ruta!
import LeadCard from './LeadCard'; // Asegúrate que la ruta sea correcta

interface Props {
    column: PipelineColumnData;
}

export default function PipelineColumn({ column }: Props) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id, // ID de la columna (etapa del pipeline)
        data: {
            type: 'Column', // Tipo para identificarlo en dnd-kit
            accepts: ['Lead'], // Define qué tipo de item puede aceptar
        },
    });

    // Clases de Tailwind
    const columnContainerClasses = `
        w-72 md:w-80 flex-shrink-0 h-full flex flex-col
        bg-zinc-800/70 rounded-lg border border-zinc-700/80 shadow-md
        transition-colors duration-200 ease-in-out
        ${isOver ? 'border-sky-500 bg-zinc-700/50' : ''}
    `; // Ancho fijo, altura completa, estilos base y resaltado cuando se arrastra sobre él
    const headerClasses = "p-3 border-b border-zinc-700 flex justify-between items-center flex-shrink-0";
    const titleClasses = "text-sm font-semibold text-zinc-100 truncate";
    const leadCountClasses = "text-xs font-medium bg-zinc-700 text-zinc-300 rounded-full px-2 py-0.5";
    const listContainerClasses = "flex-grow p-2 space-y-2 overflow-y-auto"; // Scrollable para las tarjetas

    return (
        <div ref={setNodeRef} className={columnContainerClasses}>
            {/* Encabezado de la Columna */}
            <div className={headerClasses}>
                <h3 className={titleClasses} title={column.nombre}>
                    {column.nombre}
                </h3>
                <span className={leadCountClasses}>
                    {column.leads.length}
                </span>
            </div>

            {/* Contenedor de Tarjetas (Leads) */}
            <div className={listContainerClasses}>
                <SortableContext
                    items={column.leads.map(lead => lead.id)} // IDs de los leads en esta columna
                    strategy={verticalListSortingStrategy} // Estrategia para ordenar verticalmente
                >
                    {column.leads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} />
                    ))}
                    {/* Mensaje si la columna está vacía */}
                    {column.leads.length === 0 && (
                        <div className="text-center text-xs text-zinc-500 pt-4 italic">
                            No hay leads en esta etapa.
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}
