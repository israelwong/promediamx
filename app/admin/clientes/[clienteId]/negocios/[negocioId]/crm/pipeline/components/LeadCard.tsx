// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/pipeline/components/LeadCard.tsx
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LeadCardData } from '@/app/admin/_lib/types'; // Ajusta ruta!
import { GripVertical, User, DollarSign } from 'lucide-react'; // Iconos opcionales

interface Props {
    lead: LeadCardData;
    isOverlay?: boolean; // Para aplicar estilos diferentes cuando se arrastra
}

export default function LeadCard({ lead, isOverlay }: Props) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging, // Estado para saber si se está arrastrando esta tarjeta
    } = useSortable({
        id: lead.id,
        data: { // Pasar datos adicionales para el contexto de dnd-kit
            type: 'Lead',
            parent: lead.pipelineId, // ID de la columna/etapa actual
            leadData: lead, // Pasar los datos del lead si son necesarios en onDragEnd
        },
    });

    // Estilo para aplicar transformaciones de dnd-kit
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Clases de Tailwind
    const cardBaseClasses = `
        p-3 rounded-md border bg-zinc-800 shadow-sm cursor-grab touch-none
        relative group transition-shadow duration-200 ease-in-out
        ${isDragging || isOverlay ? 'shadow-xl border-sky-500 z-10' : 'border-zinc-700 hover:shadow-md'}
        ${isOverlay ? 'opacity-90 rotate-1' : ''} // Estilo ligero para el overlay
    `;
    const cardContentClasses = "space-y-1.5";
    const leadNameClasses = "text-sm font-semibold text-zinc-100 group-hover:text-sky-300 transition-colors";
    const detailTextClasses = "text-xs text-zinc-400 flex items-center gap-1.5";
    const tagClasses = "text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded-full whitespace-nowrap";
    const tagColorDotClasses = "w-2 h-2 rounded-full inline-block mr-1 border border-zinc-500";
    const dragHandleClasses = "absolute top-1 right-1 p-1 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none";

    // Formatear valor estimado (ejemplo)
    const formattedValue = lead.valorEstimado
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(lead.valorEstimado)
        : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes} // Aplicar atributos de dnd-kit (NO listeners aquí)
            className={cardBaseClasses}
        >
            {/* Botón de arrastre explícito */}
            <button
                {...listeners} // Aplicar listeners SOLO al botón de arrastre
                className={dragHandleClasses}
                aria-label="Arrastrar lead"
            >
                <GripVertical size={16} />
            </button>

            {/* Contenido de la Tarjeta */}
            <div className={cardContentClasses}>
                <p className={leadNameClasses} title={lead.nombre}>
                    {lead.nombre}
                </p>

                {/* Agente Asignado (Opcional) */}
                {lead.agente && (
                    <p className={detailTextClasses} title={`Agente: ${lead.agente.nombre}`}>
                        <User size={12} />
                        <span>{lead.agente.nombre}</span>
                    </p>
                )}

                {/* Valor Estimado (Opcional) */}
                {formattedValue && (
                    <p className={detailTextClasses} title={`Valor: ${formattedValue}`}>
                        <DollarSign size={12} className="text-green-500" />
                        <span>{formattedValue}</span>
                    </p>
                )}

                {/* Etiquetas (Opcional) */}
                {lead.Etiquetas && lead.Etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {lead.Etiquetas.slice(0, 3).map(({ etiqueta }) => ( // Mostrar máx 3 etiquetas
                            <span key={etiqueta.id} className={tagClasses} title={etiqueta.nombre}>
                                {etiqueta.color && (
                                    <span className={tagColorDotClasses} style={{ backgroundColor: etiqueta.color }}></span>
                                )}
                                {etiqueta.nombre}
                            </span>
                        ))}
                        {lead.Etiquetas.length > 3 && (
                            <span className={tagClasses}>...</span>
                        )}
                    </div>
                )}

                {/* Fecha de Actualización (Opcional) */}
                <p className={`${detailTextClasses} text-zinc-500 pt-1 text-[10px]`}>
                    Actualizado: {new Date(lead.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
            </div>
        </div>
    );
}
