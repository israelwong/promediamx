// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ToolsPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle, Tag, Settings2, Archive, Play, Pause, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Mantener para navegación
import Cookies from 'js-cookie'; // Mantener para token
import { verifyToken } from '@/app/lib/auth'; // Mantener para sesión
import type { UsuarioExtendido } from '@/app/admin/_lib/types'; // ActionResult global

// --- NUEVAS IMPORTS PARA ACTIONS Y SCHEMAS ---
import {
    obtenerDetallesConversacionAction,
    asignarAgenteAction,
    pausarAutomatizacionConversacionAction,
    reanudarAutomatizacionConversacionAction,
    archivarConversacionAction,
} from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type {
    ConversationDetailsForPanelData,
    // AsignarAgenteConversacionParams, // El tipo se infiere en la llamada
    // GestionarPausaAutomatizacionParams,
    // ArchivarConversacionParams,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import {
    obtenerLeadDetallesAction,
    obtenerEtiquetasAsignadasLeadAction,
    actualizarEtiquetasDelLeadAction,
} from '@/app/admin/_lib/actions/lead/lead.actions'; // Asumiendo que creaste este archivo
import type {
    LeadDetailsForPanelData,
    // ObtenerLeadDetallesParams,
    // ObtenerEtiquetasAsignadasLeadParams,
    // ActualizarEtiquetasLeadParams,
} from '@/app/admin/_lib/actions/lead/lead.schemas';

import {
    obtenerEtiquetasCrmPorNegocioAction,
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.actions'; // Asumiendo que creaste este archivo
import type {
    EtiquetaCrmItemData,
    // ObtenerEtiquetasCrmNegocioParams,
} from '@/app/admin/_lib/actions/etiquetaCrm/etiquetaCrm.schemas';

import {
    obtenerAgentesCrmPorNegocioAction,
} from '@/app/admin/_lib/actions/agente/agente.actions'; // Asumiendo que creaste este archivo
import type {
    AgenteBasicoData,
    // ObtenerAgentesCrmNegocioParams,
} from '@/app/admin/_lib/actions/agente/agente.schemas';


interface ToolsPanelProps {
    conversacionId: string;
    negocioId: string;
    clienteId: string; // Para construir URLs de navegación
    onActionComplete: () => void; // Callback para refrescar el chat, por ejemplo
    // Opcional: Pasar detalles iniciales si el padre ya los cargó
    // initialConversationDetails?: ConversationDetailsForPanelData | null;
    // isLoadingConversationDetails?: boolean;
}

export default function ToolsPanel({
    conversacionId,
    negocioId,
    clienteId,
    onActionComplete,
    // initialConversationDetails,
    // isLoadingConversationDetails
}: ToolsPanelProps) {
    const [leadDetails, setLeadDetails] = useState<LeadDetailsForPanelData | null>(null);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(null);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<EtiquetaCrmItemData[]>([]);
    const [etiquetasSeleccionadasIds, setEtiquetasSeleccionadasIds] = useState<string[]>([]);
    const [agentesDisponibles, setAgentesDisponibles] = useState<AgenteBasicoData[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [isAssigningAgent, setIsAssigningAgent] = useState(false);
    const [isUpdatingPauseResume, setIsUpdatingPauseResume] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const token = Cookies.get('token'); // No es necesario obtenerlo de nuevo si ya está en context/store
    const router = useRouter(); // Para navegación
    // useEffect para validar token y obtener Usuario logueado
    useEffect(() => {
        async function validarToken(token: string | undefined) { /* ... (sin cambios) ... */
            if (token) {
                try {
                    const response = await verifyToken(token);
                    if (response.payload && 'id' in response.payload) {
                        const payload = response.payload as Record<string, unknown>;
                        const baseUserData: Partial<UsuarioExtendido> = {};
                        if (typeof payload.id === 'string') baseUserData.id = payload.id;
                        if (typeof payload.username === 'string') baseUserData.username = payload.username;
                        if (typeof payload.email === 'string') baseUserData.email = payload.email;

                        const userData: UsuarioExtendido = {
                            ...(baseUserData as UsuarioExtendido),
                            rolNombre: typeof payload.rol === 'string' ? payload.rol : null, token: token
                        };
                        console.log("[ChatComponent] Usuario logueado:", userData);
                        setUser(userData);
                    } else { Cookies.remove('token'); router.push('/login'); }
                } catch { Cookies.remove('token'); router.push('/login'); }
            } else {
                router.push('/login');
            }
        }
        validarToken(token);
    }, [router, token]);

    // const currentUserId = user?.id; // Para usar en actions si es necesario pasarlo desde cliente
    const currentUserName = user?.username || "Usuario";


    const loadInitialData = useCallback(async () => {
        if (!conversacionId || !negocioId) {
            setError("Faltan IDs de conversación o negocio.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const [convResult, etiqNegocioResult, agentesNegocioResult] = await Promise.all([
                obtenerDetallesConversacionAction({ conversacionId }), // Nueva action
                obtenerEtiquetasCrmPorNegocioAction({ negocioId }),  // Nueva action
                obtenerAgentesCrmPorNegocioAction({ negocioId })     // Nueva action
            ]);

            let currentLeadId: string | null = null;

            if (convResult.success && convResult.data) {
                setConversationDetails(convResult.data);
                currentLeadId = convResult.data.leadId;
            } else {
                setError(prev => (prev ? `${prev}\n` : '') + (convResult.error || 'Error al cargar detalles de conversación.'));
            }

            if (etiqNegocioResult.success && etiqNegocioResult.data) {
                setEtiquetasDisponibles(etiqNegocioResult.data);
            } else {
                console.error("Error cargando etiquetas del CRM:", etiqNegocioResult.error);
                // Considera si quieres añadir este error al estado 'error' principal
            }

            if (agentesNegocioResult.success && agentesNegocioResult.data) {
                setAgentesDisponibles(agentesNegocioResult.data);
            } else {
                console.error("Error cargando agentes del CRM:", agentesNegocioResult.error);
            }

            if (currentLeadId) {
                const [leadResult, etiqAsignadasResult] = await Promise.all([
                    obtenerLeadDetallesAction({ leadId: currentLeadId }),         // Nueva action
                    obtenerEtiquetasAsignadasLeadAction({ leadId: currentLeadId }) // Nueva action
                ]);

                if (leadResult.success && leadResult.data) {
                    setLeadDetails(leadResult.data);
                } else {
                    console.error("Error cargando detalles del lead:", leadResult.error);
                }
                if (etiqAsignadasResult.success && etiqAsignadasResult.data) {
                    setEtiquetasSeleccionadasIds(etiqAsignadasResult.data);
                } else {
                    console.error("Error cargando etiquetas asignadas al lead:", etiqAsignadasResult.error);
                }
            } else {
                setLeadDetails(null);
                setEtiquetasSeleccionadasIds([]);
            }
        } catch (e) {
            console.error("Error general en loadInitialData:", e);
            setError("Ocurrió un error inesperado al cargar los datos del panel.");
        } finally {
            setIsLoading(false);
        }
    }, [conversacionId, negocioId]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]); // Quitado conversacionId de aquí, ya es dependencia de loadInitialData

    const handleToggleEtiqueta = async (etiquetaId: string) => {
        if (!leadDetails?.id || !conversationDetails?.id) {
            setError("Faltan datos del lead o conversación para actualizar etiquetas.");
            return;
        }
        const currentSelectedIds = [...etiquetasSeleccionadasIds]; // Copiar para posible rollback
        const nuevasEtiquetasSeleccionadas = etiquetasSeleccionadasIds.includes(etiquetaId)
            ? etiquetasSeleccionadasIds.filter(id => id !== etiquetaId)
            : [...etiquetasSeleccionadasIds, etiquetaId];

        setEtiquetasSeleccionadasIds(nuevasEtiquetasSeleccionadas); // Actualización optimista
        setIsUpdatingTags(true); setError(null);

        const result = await actualizarEtiquetasDelLeadAction({ // Nueva action
            leadId: leadDetails.id,
            etiquetaIds: nuevasEtiquetasSeleccionadas,
            conversacionId: conversationDetails.id, // Necesario para el mensaje de sistema
            nombreAgenteQueActualiza: currentUserName,
        });

        if (!result.success) {
            setError(result.error || 'Error actualizando etiquetas.');
            setEtiquetasSeleccionadasIds(currentSelectedIds); // Rollback en caso de error
        } else {
            onActionComplete(); // Para refrescar historial de chat con mensaje de sistema
        }
        setIsUpdatingTags(false);
    };

    const handleAssignAgent = async (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newAgentId = event.target.value;
        if (!conversationDetails?.id) {
            setError("No se pudo identificar la conversación para asignar agente.");
            return;
        }
        setIsAssigningAgent(true); setError(null);

        const result = await asignarAgenteAction({ // Nueva action
            conversacionId: conversationDetails.id,
            agenteCrmId: newAgentId === "null" || newAgentId === "" ? null : newAgentId,
            nombreAgenteQueAsigna: currentUserName,
        });

        if (result.success && result.data) {
            setConversationDetails(result.data); // Actualizar detalles con el nuevo agente
            onActionComplete();
        } else {
            setError(result.error || 'Error al asignar agente.');
        }
        setIsAssigningAgent(false);
    };

    const handleTogglePauseResume = async (actionType: 'pause' | 'resume') => {
        if (!conversationDetails?.id) {
            setError("No se pudo identificar la conversación.");
            return;
        }
        setIsUpdatingPauseResume(true); setError(null);

        const actionToCall = actionType === 'pause'
            ? pausarAutomatizacionConversacionAction
            : reanudarAutomatizacionConversacionAction;

        const result = await actionToCall({ // Nueva action
            conversacionId: conversationDetails.id,
            nombreAgenteQueGestiona: currentUserName,
        });

        if (result.success && result.data) {
            setConversationDetails(result.data); // Actualizar estado de la conversación
            onActionComplete();
        } else {
            setError(result.error || `Error al ${actionType === 'pause' ? 'pausar' : 'reanudar'} automatización.`);
        }
        setIsUpdatingPauseResume(false);
    };

    const handleArchiveConversation = async () => {
        if (!conversationDetails?.id) {
            setError("No se pudo identificar la conversación para archivar.");
            return;
        }
        setIsArchiving(true); setError(null);

        const result = await archivarConversacionAction({ // Nueva action
            conversacionId: conversationDetails.id,
            nombreUsuarioQueArchiva: currentUserName,
        });

        if (result.success) {
            onActionComplete(); // Refrescar para que desaparezca de la lista activa, etc.
            // Podrías querer actualizar el estado local de conversationDetails también
            // o incluso redirigir o mostrar un mensaje de éxito más persistente.
            // Por ejemplo, llamar a loadInitialData() o una versión más ligera si solo cambia el status.
            loadInitialData();
        } else {
            setError(result.error || "Error al archivar la conversación.");
        }
        setIsArchiving(false);
    };

    // ... (Clases de botones sin cambios) ...
    const buttonBaseClasses = "w-full text-sm font-medium px-3 py-2 rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60";
    const buttonSecondaryClasses = `${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-500`;
    const buttonArchiveClasses = `${buttonBaseClasses} bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-400`;


    if (isLoading) { /* ... (mismo estado de carga) ... */ }

    const leadProfileUrl = leadDetails ? `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${leadDetails.id}` : '#';
    const currentAssignedAgentId = conversationDetails?.agenteCrmActual?.id || "";
    const isPaused = conversationDetails?.status === 'en_espera_agente' || conversationDetails?.status === 'hitl_activo';
    const isArchived = conversationDetails?.status === 'archivada';
    // const isClosed = conversationDetails?.status === 'cerrada'; // Si tienes este estado

    // JSX del componente (la estructura principal no cambia, solo los tipos de datos y llamadas a actions)
    return (
        <div className="space-y-5 h-full flex flex-col"> {/* Asegurar que tome altura para scroll si es necesario */}
            {error && <div className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-sm mb-4 whitespace-pre-line flex-shrink-0">{error}</div>}

            {isLoading && (
                <div className="flex flex-col items-center justify-center flex-grow">
                    <Loader2 size={28} className="animate-spin text-zinc-400" />
                    <p className="text-zinc-500 mt-2 text-sm">Cargando herramientas...</p>
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Detalles del Contacto */}
                    <section>
                        <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><UserCircle size={18} /> Detalles del Contacto</h4>
                        {leadDetails ? (<div className="text-xs space-y-1.5 text-zinc-400 bg-zinc-900/50 p-3 rounded-md border border-zinc-700"><p><strong>Nombre:</strong> <span className="text-zinc-200">{leadDetails.nombre}</span></p><p><strong>Email:</strong> {leadDetails.email ? <a href={`mailto:${leadDetails.email}`} className="text-blue-400 hover:underline">{leadDetails.email}</a> : <span className="text-zinc-500">N/A</span>}</p><p><strong>Teléfono:</strong> {leadDetails.telefono ? <a href={`tel:${leadDetails.telefono}`} className="text-blue-400 hover:underline">{leadDetails.telefono}</a> : <span className="text-zinc-500">N/A</span>}</p><a href={leadProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">Ver ficha completa <ExternalLink size={12} /></a></div>) : <p className="text-xs text-zinc-500">No hay detalles del lead.</p>}
                    </section>

                    {/* Acciones de Conversación */}
                    {conversationDetails && (
                        <section>
                            <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><Settings2 size={18} /> Acciones de Conversación</h4>
                            <div className="space-y-2">
                                <p className="text-xs text-zinc-400"><strong>Estado actual:</strong> <span className="font-medium text-zinc-200 capitalize">{conversationDetails.status.replace('_', ' ')}</span></p>

                                {/* Asignar Agente */}
                                <div className="mt-2">
                                    <label htmlFor="assignAgent" className="block mb-1 text-xs font-medium text-zinc-400">Asignar a Agente:</label>
                                    <div className="relative"><select id="assignAgent" key={currentAssignedAgentId} value={currentAssignedAgentId} onChange={handleAssignAgent} disabled={isAssigningAgent || agentesDisponibles.length === 0 || isArchived} className="w-full text-xs p-2 rounded-md appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950"><option value="">-- Sin asignar --</option>{agentesDisponibles.map(agente => (<option key={agente.id} value={agente.id}>{agente.nombre}</option>))}</select><ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />{isAssigningAgent && <Loader2 size={16} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}</div>{conversationDetails.agenteCrmActual && (<p className="text-xs text-zinc-500 mt-1">Asignado a: {conversationDetails.agenteCrmActual.nombre}</p>)}
                                </div>

                                {/* Botones Pausar/Reanudar (solo si no está archivada) */}
                                {!isArchived && (
                                    <>
                                        {isPaused ? (
                                            <button onClick={() => handleTogglePauseResume('resume')} className={buttonSecondaryClasses} disabled={isUpdatingPauseResume}>
                                                {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Reanudar Automatización
                                            </button>
                                        ) : (
                                            conversationDetails.status !== 'cerrada' && ( // No mostrar Pausar si está cerrada
                                                <button onClick={() => handleTogglePauseResume('pause')} className={buttonSecondaryClasses} disabled={isUpdatingPauseResume}>
                                                    {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />} Pausar (Intervención Humana)
                                                </button>
                                            )
                                        )}
                                    </>
                                )}

                                {/* --- NUEVO: Botón Archivar (solo si no está archivada) --- */}
                                {!isArchived && (
                                    <button
                                        onClick={handleArchiveConversation}
                                        className={buttonArchiveClasses} // Usar nueva clase de estilo
                                        disabled={isArchiving} // Usar nuevo estado de carga
                                    >
                                        {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                                        Archivar Conversación
                                    </button>
                                )}
                                {/* --- FIN NUEVO --- */}

                                {/* Botón Cerrar (ya no es necesario si Archivar la reemplaza, o mantener si son distintos) */}
                                {/* {conversationDetails.status !== 'cerrada' && !isArchived && (
                                            <button
                                                onClick={() => { // Lógica para cerrar 
                                                    // Podrías llamar a actualizarEstadoConversacionAction(..., 'cerrada', ...) 
                                                }}
                                                className={buttonDangerClasses}
                                                disabled={isUpdatingPauseResume || isArchiving} 
                                            >
                                                <XCircle size={16} /> Marcar como Cerrada 
                                            </button>
                                        )} */}
                            </div>
                        </section>
                    )}

                    {/* Etiquetas del Lead */}
                    {leadDetails && (
                        <section>
                            <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><Tag size={18} /> Etiquetas del Lead</h4>
                            {etiquetasDisponibles.length > 0 ? (<div className="flex flex-wrap gap-1.5">{etiquetasDisponibles.map(etiqueta => { const isSelected = etiquetasSeleccionadasIds.includes(etiqueta.id); return (<button key={etiqueta.id} onClick={() => handleToggleEtiqueta(etiqueta.id)} className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 ${isSelected ? 'text-white border-transparent' : 'text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 focus:ring-zinc-500'}`} style={{ backgroundColor: isSelected ? (etiqueta.color || '#6366f1') : 'transparent', borderColor: isSelected ? (etiqueta.color || '#6366f1') : (etiqueta.color ? etiqueta.color + '99' : undefined), color: isSelected ? 'white' : (etiqueta.color || undefined) }} disabled={isUpdatingTags}>{isUpdatingTags && etiquetasSeleccionadasIds.includes(etiqueta.id) !== isSelected ? <Loader2 size={12} className="animate-spin mr-1" /> : null}{etiqueta.nombre}</button>); })}</div>) : <p className="text-xs text-zinc-500">No hay etiquetas configuradas.</p>}
                        </section>
                    )}

                    {!leadDetails && !conversationDetails && !isLoading && (
                        <p className="text-xs text-zinc-500 text-center flex-grow flex items-center justify-center">
                            No se pudieron cargar los detalles completos.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}