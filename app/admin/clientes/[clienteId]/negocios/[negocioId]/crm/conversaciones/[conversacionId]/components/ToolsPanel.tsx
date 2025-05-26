// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ToolsPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle, Tag, Settings2, Archive, Play, Pause, Loader2, ExternalLink, ChevronDown, Info, RotateCcw } from 'lucide-react'; // Añadido RotateCcw para desarchivar
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { verifyToken } from '@/app/lib/auth';
import { type UsuarioExtendido, UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';

import {
    asignarAgenteAction,
    pausarAutomatizacionConversacionAction,
    reanudarAutomatizacionConversacionAction,
    archivarConversacionAction,
    desarchivarConversacionAction, // NUEVA ACCIÓN
} from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type {
    ConversationDetailsForPanelData,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import {
    obtenerLeadDetallesAction,
    obtenerEtiquetasAsignadasLeadAction,
    actualizarEtiquetasDelLeadAction,
} from '@/app/admin/_lib/actions/lead/lead.actions';
import type {
    LeadDetailsForPanelData,
} from '@/app/admin/_lib/actions/lead/lead.schemas';

import {
    obtenerEtiquetasCrmPorNegocioAction,
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.actions';
import type {
    EtiquetaCrmItemData,
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.schemas';

import {
    obtenerAgentesCrmPorNegocioAction,
} from '@/app/admin/_lib/actions/agente/agente.actions';
import type {
    AgenteBasicoCrmData,
} from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';


interface ToolsPanelProps {
    // conversacionId: string;
    negocioId: string;
    clienteId: string;
    onActionComplete: () => void;
    conversationDetails: ConversationDetailsForPanelData | null;
}

export default function ToolsPanel({
    // conversacionId,
    negocioId,
    clienteId,
    onActionComplete,
    conversationDetails: initialConversationDetailsProp,
}: ToolsPanelProps) {
    const [leadDetails, setLeadDetails] = useState<LeadDetailsForPanelData | null>(null);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(initialConversationDetailsProp);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<EtiquetaCrmItemData[]>([]);
    const [etiquetasSeleccionadasIds, setEtiquetasSeleccionadasIds] = useState<string[]>([]);
    const [agentesDisponibles, setAgentesDisponibles] = useState<AgenteBasicoCrmData[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [isAssigningAgent, setIsAssigningAgent] = useState(false);
    const [isUpdatingPauseResume, setIsUpdatingPauseResume] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [isUnarchiving, setIsUnarchiving] = useState(false); // NUEVO ESTADO
    const [error, setError] = useState<string | null>(null);

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const router = useRouter();
    const currentUserName = user?.username || "Usuario del Sistema";


    useEffect(() => {
        async function validarToken() {
            const currentToken = Cookies.get('token');
            if (currentToken) {
                try {
                    const response = await verifyToken(currentToken);
                    const parsedPayload = UserTokenPayloadSchema.safeParse(response.payload);
                    if (parsedPayload.success) {
                        const tokenData = parsedPayload.data;
                        setUser({
                            id: tokenData.id,
                            username: tokenData.username,
                            email: tokenData.email,
                            rolNombre: tokenData.rol,
                            token: currentToken,
                        });
                    } else { Cookies.remove('token'); router.push('/login'); }
                } catch { Cookies.remove('token'); router.push('/login'); }
            } else { router.push('/login'); }
        }
        validarToken();
    }, [router]);

    useEffect(() => {
        setConversationDetails(initialConversationDetailsProp);
    }, [initialConversationDetailsProp]);

    const loadPanelData = useCallback(async () => {
        if (!conversationDetails?.id || !negocioId) {
            if (!initialConversationDetailsProp) {
                setError("Detalles de conversación no disponibles para cargar el panel.");
            }
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        const currentLeadId = conversationDetails.leadId;
        try {
            const [etiqNegocioResult, agentesNegocioResult] = await Promise.all([
                obtenerEtiquetasCrmPorNegocioAction({ negocioId }),
                obtenerAgentesCrmPorNegocioAction({ negocioId })
            ]);
            if (etiqNegocioResult.success && etiqNegocioResult.data) setEtiquetasDisponibles(etiqNegocioResult.data);
            else setError(prev => `${prev || ''} Error etiquetas. `);
            if (agentesNegocioResult.success && agentesNegocioResult.data) setAgentesDisponibles(agentesNegocioResult.data);
            else setError(prev => `${prev || ''} Error agentes. `);

            if (currentLeadId) {
                const [leadResult, etiqAsignadasResult] = await Promise.all([
                    obtenerLeadDetallesAction({ leadId: currentLeadId }),
                    obtenerEtiquetasAsignadasLeadAction({ leadId: currentLeadId })
                ]);
                if (leadResult.success && leadResult.data) setLeadDetails(leadResult.data);
                else setError(prev => `${prev || ''} Error lead. `);
                if (etiqAsignadasResult.success && etiqAsignadasResult.data) setEtiquetasSeleccionadasIds(etiqAsignadasResult.data);
            } else {
                setLeadDetails(null); setEtiquetasSeleccionadasIds([]);
            }
        } catch { setError("Error inesperado al cargar datos del panel."); }
        finally { setIsLoading(false); }
    }, [conversationDetails, negocioId, initialConversationDetailsProp]); // Añadido initialConversationDetailsProp

    useEffect(() => {
        if (conversationDetails) loadPanelData();
        else { setIsLoading(false); if (!initialConversationDetailsProp && !error) setError("No se pudieron cargar los detalles para el panel."); }
    }, [conversationDetails, loadPanelData, initialConversationDetailsProp, error]);

    const handleToggleEtiqueta = async (etiquetaId: string) => {
        if (!leadDetails?.id || !conversationDetails?.id) { setError("Faltan datos."); return; }
        const originalEtiquetas = [...etiquetasSeleccionadasIds];
        const nuevasEtiquetas = etiquetasSeleccionadasIds.includes(etiquetaId)
            ? etiquetasSeleccionadasIds.filter(id => id !== etiquetaId)
            : [...etiquetasSeleccionadasIds, etiquetaId];
        setEtiquetasSeleccionadasIds(nuevasEtiquetas);
        setIsUpdatingTags(true); setError(null);
        const result = await actualizarEtiquetasDelLeadAction({
            leadId: leadDetails.id, etiquetaIds: nuevasEtiquetas,
            conversacionId: conversationDetails.id, nombreAgenteQueActualiza: currentUserName,
        });
        if (!result.success) { setError(result.error || 'Error.'); setEtiquetasSeleccionadasIds(originalEtiquetas); }
        else onActionComplete();
        setIsUpdatingTags(false);
    };

    const handleAssignAgent = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newAgentId = event.target.value;
        if (!conversationDetails?.id) { setError("No ID conv."); return; }
        setIsAssigningAgent(true); setError(null);
        const result = await asignarAgenteAction({
            conversacionId: conversationDetails.id,
            agenteCrmId: newAgentId === "null" || newAgentId === "" ? null : newAgentId,
            nombreAgenteQueAsigna: currentUserName,
        });
        if (result.success && result.data) { setConversationDetails(result.data); onActionComplete(); }
        else setError(result.error || 'Error.');
        setIsAssigningAgent(false);
    };

    const handleTogglePauseResume = async (actionType: 'pause' | 'resume') => {
        if (!conversationDetails?.id) { setError("No ID conv."); return; }
        setIsUpdatingPauseResume(true); setError(null);
        const actionToCall = actionType === 'pause' ? pausarAutomatizacionConversacionAction : reanudarAutomatizacionConversacionAction;
        const result = await actionToCall({ conversacionId: conversationDetails.id, nombreAgenteQueGestiona: currentUserName });
        if (result.success && result.data) { setConversationDetails(result.data); onActionComplete(); }
        else setError(result.error || `Error al ${actionType}.`);
        setIsUpdatingPauseResume(false);
    };

    const handleArchiveConversation = async () => {
        if (!conversationDetails?.id) { setError("No ID conv."); return; }
        setIsArchiving(true); setError(null);
        const result = await archivarConversacionAction({ conversacionId: conversationDetails.id, nombreUsuarioQueArchiva: currentUserName });
        if (result.success) {
            onActionComplete();
            setConversationDetails(prev => prev ? ({ ...prev, status: 'archivada' }) : null);
        } else setError(result.error || 'Error archivando.');
        setIsArchiving(false);
    };

    // --- NUEVA FUNCIÓN PARA DESARCHIVAR ---
    const handleUnarchiveConversation = async () => {
        if (!conversationDetails?.id) {
            setError("No se pudo identificar la conversación para desarchivar.");
            return;
        }
        setIsUnarchiving(true); setError(null);
        const result = await desarchivarConversacionAction({
            conversacionId: conversationDetails.id,
            nombreUsuarioQueDesarchiva: currentUserName,
        });
        if (result.success && result.data) {
            setConversationDetails(result.data); // Actualizar con el nuevo estado
            onActionComplete();
        } else {
            setError(result.error || "Error al desarchivar la conversación.");
        }
        setIsUnarchiving(false);
    };
    // --- FIN NUEVA FUNCIÓN ---

    const buttonBaseClasses = "w-full text-sm font-medium px-3 py-2 rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60";
    const buttonSecondaryClasses = `${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-500`;
    const buttonArchiveClasses = `${buttonBaseClasses} bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-400`;
    const buttonUnarchiveClasses = `${buttonBaseClasses} bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500`; // NUEVA CLASE

    if (isLoading && !conversationDetails && !leadDetails) { /* ... (estado de carga) ... */ }
    if (!conversationDetails) { /* ... (estado sin detalles) ... */ }

    const leadProfileUrl = leadDetails ? `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${leadDetails.id}` : null;
    const currentAssignedAgentId = conversationDetails?.agenteCrmActual?.id || "";
    const isPaused = conversationDetails?.status === 'en_espera_agente' || conversationDetails?.status === 'hitl_activo';
    const isArchived = conversationDetails?.status === 'archivada';

    return (
        <div className="space-y-5 h-full flex flex-col">
            {error && <div className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-sm mb-4 whitespace-pre-line flex-shrink-0">{error}</div>}
            {isLoading && (!conversationDetails || (conversationDetails.leadId && !leadDetails)) && (
                <div className="flex flex-col items-center justify-center flex-grow">
                    <Loader2 size={28} className="animate-spin text-zinc-400" />
                    <p className="text-zinc-500 mt-2 text-sm">Cargando herramientas...</p>
                </div>
            )}

            {!isLoading && conversationDetails && ( // Solo mostrar contenido si no está cargando y hay detalles de conversación
                <>
                    <section>
                        <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><UserCircle size={18} /> Detalles del Contacto</h4>
                        {leadDetails ? (
                            <div className="text-xs space-y-1.5 text-zinc-400 bg-zinc-900/50 p-3 rounded-md border border-zinc-700">
                                <p><strong>Nombre:</strong> <span className="text-zinc-200">{leadDetails.nombre}</span></p>
                                <p><strong>Email:</strong> {leadDetails.email ? <a href={`mailto:${leadDetails.email}`} className="text-blue-400 hover:underline">{leadDetails.email}</a> : <span className="text-zinc-500">N/A</span>}</p>
                                <p><strong>Teléfono:</strong> {leadDetails.telefono ? <a href={`tel:${leadDetails.telefono}`} className="text-blue-400 hover:underline">{leadDetails.telefono}</a> : <span className="text-zinc-500">N/A</span>}</p>
                                {leadProfileUrl &&
                                    <a href={leadProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
                                        Ver ficha completa <ExternalLink size={12} />
                                    </a>
                                }
                            </div>
                        ) : <p className="text-xs text-zinc-500">No hay detalles del lead asociados.</p>}
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><Settings2 size={18} /> Acciones de Conversación</h4>
                        <div className="space-y-2">
                            <p className="text-xs text-zinc-400"><strong>Estado actual:</strong> <span className="font-medium text-zinc-200 capitalize">{(conversationDetails.status || 'desconocido').replace('_', ' ')}</span></p>
                            <div className="mt-2">
                                <label htmlFor="assignAgent" className="block mb-1 text-xs font-medium text-zinc-400">Asignar a Agente:</label>
                                <div className="relative">
                                    <select
                                        id="assignAgent"
                                        value={currentAssignedAgentId}
                                        onChange={handleAssignAgent}
                                        disabled={isAssigningAgent || agentesDisponibles.length === 0 || isArchived}
                                        className="w-full text-xs p-2 rounded-md appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950"
                                    >
                                        <option value="">-- Sin asignar --</option>
                                        {agentesDisponibles.map(agente => (<option key={agente.id} value={agente.id}>{agente.nombre || `Agente ${agente.id.substring(0, 4)}`}</option>))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                                    {isAssigningAgent && <Loader2 size={16} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
                                </div>
                                {conversationDetails.agenteCrmActual && (<p className="text-xs text-zinc-500 mt-1">Asignado a: {conversationDetails.agenteCrmActual.nombre || `Agente ${conversationDetails.agenteCrmActual.id.substring(0, 4)}`}</p>)}
                            </div>

                            {/* --- LÓGICA DE BOTONES ARCHIVAR/DESARCHIVAR Y PAUSAR/REANUDAR --- */}
                            {isArchived ? (
                                <button
                                    onClick={handleUnarchiveConversation}
                                    className={buttonUnarchiveClasses}
                                    disabled={isUnarchiving}
                                >
                                    {isUnarchiving ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} {/* Icono para desarchivar */}
                                    Desarchivar Conversación
                                </button>
                            ) : (
                                <>
                                    {isPaused ? (
                                        <button onClick={() => handleTogglePauseResume('resume')} className={buttonSecondaryClasses} disabled={isUpdatingPauseResume}>
                                            {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Reanudar Automatización
                                        </button>
                                    ) : (
                                        conversationDetails.status !== 'cerrada' && (
                                            <button onClick={() => handleTogglePauseResume('pause')} className={buttonSecondaryClasses} disabled={isUpdatingPauseResume}>
                                                {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />} Pausar (Intervención Humana)
                                            </button>
                                        )
                                    )}
                                    <button
                                        onClick={handleArchiveConversation}
                                        className={buttonArchiveClasses}
                                        disabled={isArchiving}
                                    >
                                        {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                                        Archivar Conversación
                                    </button>
                                </>
                            )}
                            {/* --- FIN LÓGICA DE BOTONES --- */}
                        </div>
                    </section>

                    {leadDetails && (
                        <section>
                            <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><Tag size={18} /> Etiquetas del Lead</h4>
                            {/* ... (lógica de etiquetas sin cambios) ... */}
                            {!isLoading && etiquetasDisponibles.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {etiquetasDisponibles.map(etiqueta => {
                                        const isSelected = etiquetasSeleccionadasIds.includes(etiqueta.id);
                                        return (
                                            <button
                                                key={etiqueta.id}
                                                onClick={() => handleToggleEtiqueta(etiqueta.id)}
                                                className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 
                                            ${isSelected ? 'text-white border-transparent' : 'text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 focus:ring-zinc-500'}`}
                                                style={{
                                                    backgroundColor: isSelected ? (etiqueta.color || '#4f46e5') : 'transparent',
                                                    borderColor: isSelected ? (etiqueta.color || '#4f46e5') : (etiqueta.color ? etiqueta.color + '99' : undefined),
                                                    color: isSelected ? 'white' : (etiqueta.color || undefined)
                                                }}
                                                disabled={isUpdatingTags}
                                            >
                                                {isUpdatingTags && etiquetasSeleccionadasIds.includes(etiqueta.id) !== isSelected ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                                                {etiqueta.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : !isLoading && <p className="text-xs text-zinc-500">No hay etiquetas configuradas para este negocio.</p>}
                        </section>
                    )}
                </>
            )}
            {/* Fallback si no hay detalles de conversación y no está cargando (error del padre o estado inesperado) */}
            {!isLoading && !conversationDetails && !error && (
                <div className="text-xs text-zinc-500 p-2 text-center flex-grow flex items-center justify-center">
                    <Info size={14} className="mr-2" /> Selecciona una conversación para ver sus herramientas.
                </div>
            )}
        </div>
    );
}
