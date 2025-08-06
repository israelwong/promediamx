"use client";

import { Bitacora, Agente } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { MessageSquare, UserPlus, ArrowRightLeft, Pencil, UserCheck } from 'lucide-react';

// Extendemos el tipo para incluir el objeto 'agente' que viene de la consulta
export type HistorialItem = Bitacora & { agente: Pick<Agente, 'nombre'> | null };

// Mapeo de tipos de acción a íconos para una UI más clara
const actionIcons: { [key: string]: React.ReactNode } = {
    NOTA_MANUAL: <MessageSquare className="h-4 w-4 text-zinc-400" />,
    CREACION_LEAD: <UserPlus className="h-4 w-4 text-green-400" />,
    EDICION_LEAD: <Pencil className="h-4 w-4 text-amber-400" />,
    CAMBIO_ETAPA: <ArrowRightLeft className="h-4 w-4 text-blue-400" />,
    ASIGNACION_AGENTE: <UserCheck className="h-4 w-4 text-purple-400" />,
    TRANSFERENCIA_AGENTE: <UserCheck className="h-4 w-4 text-pink-400" />,
};

export default function HistorialLead({ initialItems }: { initialItems: HistorialItem[] }) {
    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader><CardTitle>Historial del Prospecto</CardTitle></CardHeader>
            <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                    {initialItems.length > 0 ? initialItems.map(item => (
                        <div key={item.id} className="flex gap-3">
                            <div className="mt-1">
                                {actionIcons[item.tipoAccion] || <Pencil className="h-4 w-4 text-zinc-500" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-zinc-200">{item.descripcion}</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {item.agente?.nombre || 'Sistema'} • {format(new Date(item.createdAt), "d MMM, yyyy HH:mm", { locale: es })}h
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-sm text-zinc-500 py-4">No hay actividades registradas.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}