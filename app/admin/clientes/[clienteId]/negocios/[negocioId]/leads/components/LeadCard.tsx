"use client";
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/app/components/ui/card";
import { GripVertical } from 'lucide-react';
import { type LeadInKanbanCard } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.schemas';

import { useCitaModalStore } from '@/app/admin/_lib/hooks/useCitaModalStore';


interface LeadCardProps {
    lead: LeadInKanbanCard;
    isDragging?: boolean;
}

export default function LeadCard({ lead, isDragging = false }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({ id: lead.id, data: { lead } });

    const { onOpen } = useCitaModalStore();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging || isDragging ? 0.7 : 1,
        boxShadow: isSortableDragging || isDragging ? '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.3)' : 'none',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card
                onClick={() => onOpen(lead.id)} // Abrimos el modal al hacer clic
                className="bg-zinc-900 border-zinc-700/80 hover:border-zinc-600 transition-all cursor-grab active:cursor-grabbing">
                <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-zinc-200 break-words">{lead.nombre}</p>
                        <div {...listeners} className="p-1 text-zinc-500 hover:text-zinc-100 touch-none" title="Arrastrar lead">
                            <GripVertical size={16} />
                        </div>
                    </div>
                    {lead.agente?.nombre && (
                        <p className="text-xs text-purple-400 mt-2">Agente: {lead.agente.nombre}</p>
                    )}
                    {lead.Etiquetas && lead.Etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {lead.Etiquetas.map(item => (
                                <span key={item.etiqueta.id} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
                                    {item.etiqueta.nombre}
                                </span>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}