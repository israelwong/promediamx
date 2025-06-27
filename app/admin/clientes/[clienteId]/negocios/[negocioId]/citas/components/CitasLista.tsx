'use client';

import React from 'react';
import type { CitaType } from '@/app/admin/_lib/actions/citas/citas.schemas';
// import { useCitaModalStore } from '@/app/admin/_lib/hooks/useCitaModalStore'; // Importamos nuestro store
import { Badge } from '@/app/components/ui/badge';
import { CheckCircle, Clock, XCircle, RefreshCcw, User, Phone, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
interface Props {
    citas: CitaType[];
    negocioId: string; // Añadimos el negocioId para futuras referencias
    clienteId: string; // Opcional, si necesitas el ID del cliente
}

const statusMap: { [key: string]: { icon: React.ElementType; color: string; label: string } } = {
    PENDIENTE: { icon: Clock, color: 'bg-amber-500/20 text-amber-300', label: 'Pendiente' },
    COMPLETADA: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400', label: 'Completada' },
    CANCELADA: { icon: XCircle, color: 'bg-red-500/20 text-red-400', label: 'Cancelada' },
    REAGENDADA: { icon: RefreshCcw, color: 'bg-blue-500/20 text-blue-400', label: 'Reagendada' },
    NO_ASISTIO: { icon: User, color: 'bg-zinc-500/20 text-zinc-300', label: 'No Asistió' },
};

export function CitasLista({ citas, negocioId, clienteId }: Props) {

    const router = useRouter();
    // Obtenemos la función para abrir el modal desde nuestro store
    // const { onOpen } = useCitaModalStore();

    // if (citas.length === 0) {
    //     return <p className="text-center text-zinc-400 py-8">No hay citas para mostrar.</p>
    // }

    const handleRowClick = (cita: CitaType) => {
        // Al hacer clic, abrimos el modal pasándole AMBOS IDs:
        // el del lead y el de la cita específica.
        if (cita.lead && 'id' in cita.lead && cita.lead.id) {
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${cita.lead.id}`);
            // onOpen(String(cita.lead.id), String(cita.id));
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
                <thead>
                    <tr className="border-b border-zinc-700">
                        <th className="text-left font-medium text-zinc-400 p-3">Cliente</th>
                        <th className="text-left font-medium text-zinc-400 p-3">Tipo de Cita</th>
                        <th className="text-left font-medium text-zinc-400 p-3">Fecha y Hora</th>
                        <th className="text-left font-medium text-zinc-400 p-3">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {citas.map((cita) => {
                        const statusInfo = statusMap[cita.status] || statusMap['PENDIENTE'];
                        return (
                            // Añadimos el evento onClick a la fila y la hacemos interactiva
                            <tr
                                key={cita.id}
                                onClick={() => handleRowClick(cita)}
                                className="border-b border-zinc-700/50 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                            >
                                <td className="p-3">
                                    <div className="font-medium text-zinc-100">{cita.lead.nombre}</div>
                                    <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1"><Phone size={12} />{cita.lead.telefono || 'N/A'}</div>
                                </td>
                                <td className="p-3 text-zinc-300">
                                    <div className="flex items-center gap-1.5"><Tag size={12} />{cita.tipoDeCita?.nombre || cita.asunto}</div>
                                </td>
                                <td className="p-3 text-zinc-300">
                                    {new Date(cita.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                                </td>
                                <td className="p-3">
                                    <Badge variant="outline" className={`${statusInfo.color} border-current/50`}>
                                        <statusInfo.icon className="h-3.5 w-3.5 mr-1.5" />
                                        {statusInfo.label}
                                    </Badge>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
}