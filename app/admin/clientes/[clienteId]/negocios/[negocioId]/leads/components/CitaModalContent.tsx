"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { type LeadDetails } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { type NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import { agregarNotaLeadAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import { cambiarEtapaLeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { actualizarEstadoCitaAction } from '@/app/admin/_lib/actions/citas/citas.actions';
import { useCitaModalStore } from '@/app/admin/_lib/hooks/useCitaModalStore';
import { Button } from '@/app/components/ui/button';
import { Badge } from "@/app/components/ui/badge";
import { StatusAgenda } from '@/app/admin/_lib/actions/citas/citas.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import { Edit, Save, Loader2, Check, PhoneForwarded, UserX, CheckCircle, XCircle } from 'lucide-react';
import { verifyToken } from '@/app/lib/auth';
import { UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';
import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';

interface CitaModalContentProps {
    lead: LeadDetails;
    initialNotes: NotaBitacora[];
    negocioId: string;
    clienteId: string;
    agendaId?: string;
}

export default function CitaModalContent({ lead, initialNotes, clienteId, negocioId, agendaId }: CitaModalContentProps) {
    const router = useRouter();
    const { onClose } = useCitaModalStore();
    const [notas, setNotas] = useState(initialNotes);
    const [nuevaNota, setNuevaNota] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<AgenteBasicoCrmData | null>(null);
    const [isLoadingAgent, setIsLoadingAgent] = useState(true);

    useEffect(() => {
        async function fetchCurrentAgent() {
            setIsLoadingAgent(true);
            const token = Cookies.get('token');
            if (!token) { setIsLoadingAgent(false); return; }
            try {
                const verifiedToken = await verifyToken(token);
                const parsedPayload = UserTokenPayloadSchema.safeParse(verifiedToken.payload);
                if (parsedPayload.success) {
                    const agentResult = await obtenerAgenteCrmPorUsuarioAction(parsedPayload.data.id, negocioId);
                    if (agentResult.success && agentResult.data) setCurrentAgent(agentResult.data);
                }
            } catch (error) { console.error("Error obteniendo agente:", error); }
            finally { setIsLoadingAgent(false); }
        }
        fetchCurrentAgent();
    }, [negocioId]);

    const handleAction = async (promise: Promise<ActionResult<unknown>>, successMessage: string, closeOnSuccess = false) => {
        toast.promise(promise, {
            loading: 'Actualizando...',
            success: (result) => {
                if (result.success) {
                    router.refresh();
                    if (closeOnSuccess) onClose();
                    return successMessage;
                } else {
                    throw new Error(result.error || 'Ocurrió un error.');
                }
            },
            error: (err) => `Error: ${err.message}`,
        });
    };

    const handleUpdateLeadStage = (stageName: string, successMsg: string) => {
        handleAction(
            cambiarEtapaLeadAction({ leadId: lead.id, negocioId, nombreEtapaDestino: stageName }),
            successMsg,
            true // Cierra el modal al cambiar de etapa
        );
    };

    const handleUpdateAppointmentStatus = (newStatus: StatusAgenda) => {
        if (!agendaId) {
            toast.error("No hay una cita asociada para actualizar.");
            return;
        }
        handleAction(
            actualizarEstadoCitaAction({ agendaId, nuevoEstado: newStatus }),
            `Cita marcada como: ${newStatus.toLowerCase().replace('_', ' ')}`
        );
    };

    const handleAddNota = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nuevaNota.trim()) return;
        setIsSavingNote(true);
        const result = await agregarNotaLeadAction({ leadId: lead.id, agenteId: currentAgent?.id || null, descripcion: nuevaNota });
        if (result.success && result.data) {
            toast.success("Nota añadida.");
            setNotas([result.data, ...notas]);
            setNuevaNota("");
        } else {
            toast.error(result.error || "No se pudo guardar la nota.");
        }
        setIsSavingNote(false);
    };

    const handleEdicionAvanzada = () => {
        window.open(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${lead.id}`, '_blank');
        onClose();
    };

    const isLeadFinalizado = ['Ganado', 'Perdido'].includes(lead.etapaPipeline?.nombre || '');
    const etiquetaColegio = lead.etiquetas?.find(et => et.nombre.toLowerCase().includes('colegio'));

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h4 className="font-semibold text-zinc-300">Resumen del Lead</h4>
                <div className="text-sm text-zinc-400 mt-2 space-y-2"> {/* Aumentamos un poco el espacio */}

                    {/* CORRECCIÓN: Usamos un <div> en lugar de <p> para anidar el Badge */}
                    {etiquetaColegio && (
                        <div className="flex items-center gap-2">
                            <strong>Interés Principal:</strong>
                            <Badge variant="secondary">{etiquetaColegio.nombre}</Badge>
                        </div>
                    )}
                    <div><strong>Email:</strong> {lead.email || 'No disponible'}</div>
                    <div><strong>Teléfono:</strong> {lead.telefono || 'No disponible'}</div>

                    {/* CORRECCIÓN: Usamos un <div> en lugar de <p> aquí también */}
                    <div className="flex items-center gap-2">
                        <strong>Etapa Actual:</strong>
                        <Badge variant={isLeadFinalizado ? "default" : "outline"}>{lead.etapaPipeline?.nombre || 'Sin etapa'}</Badge>
                    </div>

                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-zinc-300">Acciones</h4>

                {agendaId && (
                    <div>
                        <label className="text-xs text-zinc-500">Estado de esta Cita</label>
                        <div className="flex gap-2 mt-1">
                            <Button onClick={() => handleUpdateAppointmentStatus(StatusAgenda.COMPLETADA)} variant="outline" className="w-full"><CheckCircle className="h-4 w-4 mr-2" />Asistió</Button>
                            <Button onClick={() => handleUpdateAppointmentStatus(StatusAgenda.NO_ASISTIO)} variant="outline" className="w-full"><XCircle className="h-4 w-4 mr-2" />No Asistió</Button>
                        </div>
                    </div>
                )}

                {!isLeadFinalizado ? (
                    <div>
                        <label className="text-xs text-zinc-500">Actualizar Etapa del Lead</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <Button onClick={() => handleUpdateLeadStage('Seguimiento', 'Lead movido a Seguimiento')} variant="outline"><PhoneForwarded className="h-4 w-4 mr-2" />Mover a Seguimiento</Button>
                            <Button onClick={() => handleUpdateLeadStage('Perdido', 'Lead movido a Perdido')} variant="destructive"><UserX className="h-4 w-4 mr-2" />Marcar como Perdido</Button>
                            <Button onClick={() => handleUpdateLeadStage('Ganado', '¡Lead marcado como Ganado!')} className="bg-green-600 hover:bg-green-700 text-white sm:col-span-2">
                                <Check className="h-4 w-4 mr-2" />Marcar como Ganado (Matriculado)
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-sm text-zinc-400 bg-zinc-800 p-3 rounded-md border border-zinc-700">
                        Este lead ya está en la etapa final: <span className="font-semibold">{lead.etapaPipeline?.nombre}</span>.
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h4 className="font-semibold text-zinc-300">Historial de Notas</h4>
                <form onSubmit={handleAddNota} className="space-y-2">
                    <textarea value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)}
                        className="w-full bg-zinc-800 border-zinc-700 rounded-md p-2 text-sm text-zinc-200 placeholder-zinc-500 focus:ring-blue-500 focus:border-blue-500"
                        rows={3} placeholder="Añadir un comentario o nota de seguimiento..." disabled={isLoadingAgent} />
                    <Button type="submit" disabled={isSavingNote || !nuevaNota.trim() || isLoadingAgent} className="w-full">
                        {isLoadingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : isSavingNote ? "Guardando..." : "Guardar Nota"}
                        {!isSavingNote && !isLoadingAgent && <Save className="h-4 w-4 ml-2" />}
                    </Button>
                </form>

                <div className="space-y-3 pt-4 border-t border-zinc-800 max-h-48 overflow-y-auto custom-scrollbar">
                    {notas.length > 0 ? (notas.map(nota => (
                        <div key={nota.id} className="text-sm bg-zinc-800/50 p-3 rounded-md border border-zinc-700/50">
                            <p className="text-zinc-200 whitespace-pre-wrap">{nota.descripcion}</p>
                            <p className="text-xs text-zinc-500 mt-2 text-right">
                                {nota.agente?.nombre || 'Sistema'} - {format(new Date(nota.createdAt), "d MMM yy, HH:mm", { locale: es })}h
                            </p>
                        </div>
                    ))) : (
                        <p className="text-center text-sm text-zinc-500 py-4">No hay notas para este lead.</p>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-zinc-700/50 flex justify-end">
                <Button onClick={handleEdicionAvanzada} variant="ghost"><Edit className="h-4 w-4 mr-2" />Edición Avanzada</Button>
            </div>
        </div>
    );
}