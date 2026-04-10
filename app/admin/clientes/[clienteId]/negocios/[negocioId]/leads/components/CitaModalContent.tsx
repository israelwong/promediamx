// Ruta: admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/CitaModalContent.tsx
"use client";

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { type LeadDetails } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { type NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import { useCitaModalStore } from '@/app/admin/_lib/hooks/useCitaModalStore';
import { Button } from '@/app/components/ui/button';
import { Badge } from "@/app/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import {
    User, Mail, Phone, Briefcase, School, GraduationCap, Star, MessageSquare, Edit, NotebookText
} from 'lucide-react';

interface CitaModalContentProps {
    lead: LeadDetails;
    initialNotes: NotaBitacora[];
    negocioId: string;
    clienteId: string;
}

// Componente para mostrar un campo de información
const InfoField = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-zinc-500 mt-1">{icon}</div>
        <div>
            <p className="text-xs text-zinc-400">{label}</p>
            {/* ✅ CORRECCIÓN: Se cambió la etiqueta <p> por <div> para evitar el error de anidación. */}
            {/* Esto permite que el valor pueda ser un componente como <Badge> sin causar un error de hidratación. */}
            <div className="text-sm font-medium text-zinc-200">{value || <span className="text-zinc-500">No disponible</span>}</div>
        </div>
    </div>
);

export default function CitaModalContent({ lead, initialNotes, clienteId, negocioId }: CitaModalContentProps) {
    const { onClose } = useCitaModalStore();
    const ultimaNota = initialNotes?.[0];

    // Se extraen los datos del JSON de forma segura
    const jsonParams = (lead.jsonParams as { colegio?: string; nivel_educativo?: string; grado?: string; }) || {};

    const handleEdicionAvanzada = () => {
        window.open(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${lead.id}`, '_blank');
        onClose();
    };

    return (
        <div className="space-y-6">
            {/* --- Sección de Información General --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InfoField icon={<User size={16} />} label="Nombre Completo" value={lead.nombre} />
                <InfoField icon={<Mail size={16} />} label="Correo Electrónico" value={lead.email} />
                <InfoField icon={<Phone size={16} />} label="Teléfono" value={lead.telefono} />
                <InfoField
                    icon={<Briefcase size={16} />}
                    label="Etapa Actual"
                    value={<Badge variant="outline">{lead.etapaPipeline?.nombre || 'Sin etapa'}</Badge>}
                />
            </div>

            {/* --- Sección de Datos Académicos --- */}
            <div className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                <h4 className="text-sm font-semibold text-zinc-300 mb-3">Datos Académicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <InfoField icon={<School size={16} />} label="Colegio" value={jsonParams.colegio} />
                    <InfoField icon={<GraduationCap size={16} />} label="Nivel Educativo" value={jsonParams.nivel_educativo} />
                    <InfoField icon={<Star size={16} />} label="Grado" value={jsonParams.grado} />
                </div>
            </div>

            {/* --- Sección de Etiquetas --- */}
            {lead.etiquetas && lead.etiquetas.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2">Etiquetas Asignadas</h4>
                    <div className="flex flex-wrap gap-2">
                        {lead.etiquetas.map(tag => (
                            <Badge key={tag.id} variant="secondary" style={{ backgroundColor: `${tag.color ?? "#888"}20`, color: tag.color ?? "#888" }}>
                                {tag.nombre}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* --- Sección de Última Nota --- */}
            {ultimaNota && (
                <div>
                    <h4 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
                        <NotebookText size={16} /> Última Nota Registrada
                    </h4>
                    <div className="text-sm bg-zinc-800/50 p-3 rounded-md border border-zinc-700/50">
                        <p className="text-zinc-300 whitespace-pre-wrap">{ultimaNota.descripcion}</p>
                        <p className="text-xs text-zinc-500 mt-2 text-right">
                            {format(new Date(ultimaNota.createdAt), "d MMM yyyy, HH:mm", { locale: es })}h
                        </p>
                    </div>
                </div>
            )}

            {/* --- Pie de Acciones --- */}
            <div className="pt-5 border-t border-zinc-700/50 flex justify-end gap-3">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* El botón está deshabilitado temporalmente */}
                            <Button variant="outline" disabled>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Enviar Mensaje
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Próximamente: Enviar plantillas de ManyChat.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <Button onClick={handleEdicionAvanzada}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Lead
                </Button>
            </div>
        </div>
    );
}
