/* RUTA: app/admin/.../kanban/components/LeadCard.tsx */
'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from '@/app/components/ui/badge';
import { GripVertical, Calendar, Building } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
    } = useSortable({ id: lead.id, data: { type: 'Lead', lead } });

    const { onOpen } = useCitaModalStore();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isSortableDragging || isDragging ? 0.7 : 1,
    };

    const colegio = (lead.jsonParams as { colegio?: string })?.colegio;

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card
                onClick={() => onOpen(lead.id)}
                className="mb-3 bg-zinc-900 border-zinc-700/80 hover:border-zinc-600 transition-all cursor-grab active:cursor-grabbing">
                <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-zinc-200 break-words pr-2">{lead.nombre}</p>
                        <div {...listeners} className="p-1 text-zinc-500 hover:text-zinc-100 touch-none flex-shrink-0" title="Arrastrar lead">
                            <GripVertical size={16} />
                        </div>
                    </div>

                    {colegio && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-400">
                            <Building size={12} />
                            <span>{colegio}</span>
                        </div>
                    )}

                    {lead.fechaProximaCita && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-400">
                            <Calendar size={12} />
                            <span>{format(new Date(lead.fechaProximaCita), "d MMM, h:mm a", { locale: es })}</span>
                        </div>
                    )}

                    {lead.Etiquetas && lead.Etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {lead.Etiquetas.map(tag => (
                                <Badge
                                    key={tag.id}
                                    variant="secondary"
                                    style={{
                                        backgroundColor: `${tag.color ?? '#000'}20`,
                                        color: tag.color ?? '#000',
                                        borderColor: `${tag.color ?? '#000'}40`
                                    }}
                                >
                                    {tag.nombre}
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
