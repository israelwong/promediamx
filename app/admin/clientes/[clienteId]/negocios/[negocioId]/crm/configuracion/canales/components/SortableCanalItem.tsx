// SortableCanalItem.tsx
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, PencilIcon } from 'lucide-react';
import type { CanalCrmData } from '@/app/admin/_lib/actions/canalCrm/canalCrm.schemas'; // Ajusta ruta
import { Badge } from "@/app/components/ui/badge"; // Ajusta ruta

interface SortableCanalItemProps {
    canal: CanalCrmData;
    onEditClick: (canal: CanalCrmData) => void;
    // Clases pasadas como props para mantener consistencia
    listItemClasses: string;
    buttonEditClasses: string;
    isSubmitting: boolean; // Para deshabilitar botones mientras se guarda el orden
}

export function SortableCanalItem({
    canal,
    onEditClick,
    listItemClasses,
    buttonEditClasses,
    isSubmitting
}: SortableCanalItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: canal.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 100 : 'auto', // Para que el ítem arrastrado esté por encima
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
    };

    return (
        <li ref={setNodeRef} style={style} className={`${listItemClasses} ${isDragging ? 'shadow-xl' : ''}`}>
            <div className="flex items-center gap-2 flex-grow">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 cursor-grab focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    title="Reordenar canal"
                    disabled={isSubmitting}
                >
                    <GripVertical size={16} />
                </button>
                <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={canal.nombre}>
                    {canal.nombre}
                </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                    variant={canal.status === 'activo' ? 'default' : 'outline'}
                    className={`text-xs whitespace-nowrap ${canal.status === 'activo' ? 'bg-green-600/80 border-green-500 text-white' : 'border-zinc-500 text-zinc-400'}`}
                >
                    {canal.status}
                </Badge>
                <button
                    onClick={() => onEditClick(canal)}
                    className={buttonEditClasses}
                    title="Editar Canal"
                    disabled={isSubmitting}
                >
                    <PencilIcon size={14} />
                </button>
            </div>
        </li>
    );
}