'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- NUEVA IMPORTACIÓN DEL TIPO ZOD ---
import type { LeadCardKanbanData } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas'; // Ajusta la ruta!

import { GripVertical, User, DollarSign } from 'lucide-react'; // Añadido CheckCircle para ejemplo

interface Props {
    lead: LeadCardKanbanData; // Usar el nuevo tipo Zod
    isOverlay?: boolean;    // Para estilos cuando se arrastra en DragOverlay
    parentColumnId?: string; // ID de la columna (etapa) a la que pertenece este lead
    // parentColumnId: string; 
}

export default function LeadCard({ lead, isOverlay }: Props) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: lead.id,
        data: { // Datos cruciales para dnd-kit en el componente padre (PipelinePanel)
            type: 'LeadCard', // Identificador del tipo de ítem
            leadId: lead.id,  // El ID del lead mismo
            parentColumnId: lead.pipelineId, // El ID de la columna (etapa) a la que pertenece este lead
            leadData: lead, // Pasar los datos completos del lead para el DragOverlay
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging && !isOverlay ? 0.5 : 1, // Atenuar el original si se arrastra
        boxShadow: isDragging || isOverlay ? '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -2px rgba(0,0,0,0.15)' : undefined,
    };

    // Clases de Tailwind (puedes ajustar según tu guía de estilos)
    const cardBaseClasses = `
        p-3 rounded-lg border bg-zinc-800 shadow-md cursor-pointer touch-none 
        relative group transition-all duration-200 ease-in-out
        ${isDragging && !isOverlay ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-900' : 'border-zinc-700 hover:border-zinc-600 hover:shadow-lg'}
        ${isOverlay ? 'shadow-2xl border-sky-500 scale-105 cursor-grabbing' : 'hover:bg-zinc-700/30'}
    `; // Ajustado cursor-pointer y hover
    const cardContentClasses = "space-y-1.5";
    const leadNameClasses = "text-sm font-semibold text-zinc-100 group-hover:text-sky-400 transition-colors";
    const detailTextClasses = "text-xs text-zinc-400 flex items-center gap-1.5";
    const tagClasses = "text-[0.7rem] px-2 py-0.5 rounded-full whitespace-nowrap"; // Ajustado padding
    // const tagColorDotClasses = "w-2 h-2 rounded-full inline-block mr-1 border border-zinc-600"; // Ligeramente más oscuro el borde
    const dragHandleClasses = "absolute top-1.5 right-1.5 p-1 text-zinc-500 group-hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab touch-none focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-sky-500 rounded";

    const formattedValue = lead.valorEstimado
        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(lead.valorEstimado)
        : null;

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' });
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            // Los atributos de dnd-kit van en el elemento principal que se arrastra
            // Si quieres que toda la tarjeta sea el handle, pon {...attributes} {...listeners} aquí.
            // Si tienes un handle específico (como el botón con GripVertical), ponlos allí.
            className={cardBaseClasses}
            // Si no quieres que toda la tarjeta active el drag, quita {...listeners} de aquí
            // y déjalos solo en el botón de agarre.
            // Por ahora, asumiré que la tarjeta completa es el target inicial del drag,
            // y el botón es un indicador visual y un target alternativo.
            {...attributes}
            {...listeners}
        >
            {/* Botón de arrastre explícito (opcional si toda la tarjeta es arrastrable) */}
            {/* Si toda la tarjeta es arrastrable, este botón es más un indicador visual */}
            <button
                // {...listeners} // Si solo el botón es el handle, los listeners van aquí.
                className={dragHandleClasses}
                aria-label="Arrastrar lead"
                tabIndex={-1} // Para que no sea enfocable si la tarjeta ya lo es
            >
                <GripVertical size={16} />
            </button>

            <div className={cardContentClasses}>
                <p className={leadNameClasses} title={lead.nombre}>
                    {lead.nombre}
                </p>

                {lead.agente?.nombre && (
                    <p className={detailTextClasses} title={`Agente: ${lead.agente.nombre}`}>
                        <User size={11} className="flex-shrink-0" />
                        <span className="truncate">{lead.agente.nombre}</span>
                    </p>
                )}

                {formattedValue && (
                    <p className={`${detailTextClasses} font-medium`} title={`Valor: ${formattedValue}`}>
                        <DollarSign size={11} className="text-green-500 flex-shrink-0" />
                        <span className="text-green-400">{formattedValue}</span>
                    </p>
                )}

                {/* Si tienes un estado de "ganado" o "completado" para el lead */}
                {/* 
                {lead.pipelineId && boardData?.columns.find(c => c.id === lead.pipelineId)?.nombre.toLowerCase() === 'ganado' && (
                     <p className={`${detailTextClasses} text-emerald-400`}>
                        <CheckCircle size={11} /> Ganado
                    </p>
                )}
                */}


                {lead.Etiquetas && lead.Etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {lead.Etiquetas.slice(0, 2).map(({ etiqueta }) => ( // Mostrar máx 2 para no saturar
                            etiqueta && (
                                <span
                                    key={etiqueta.id}
                                    className={`${tagClasses} border`}
                                    style={{
                                        backgroundColor: etiqueta.color ? `${etiqueta.color}20` : 'rgb(var(--zinc-700))', // Fondo semitransparente o gris
                                        borderColor: etiqueta.color ? `${etiqueta.color}80` : 'rgb(var(--zinc-600))',
                                        color: etiqueta.color || 'rgb(var(--zinc-300))'
                                    }}
                                    title={etiqueta.nombre}
                                >
                                    {/* No necesitamos el punto de color si el badge ya tiene color de fondo/borde */}
                                    {etiqueta.nombre}
                                </span>
                            )
                        ))}
                        {lead.Etiquetas.length > 2 && (
                            <span className={`${tagClasses} bg-zinc-600 text-zinc-300`}>+{lead.Etiquetas.length - 2}</span>
                        )}
                    </div>
                )}

                <p className={`${detailTextClasses} text-zinc-500 pt-1.5 text-[10px] justify-end w-full`}>
                    Act: {formatDate(lead.updatedAt)}
                </p>
            </div>
        </div>
    );
}