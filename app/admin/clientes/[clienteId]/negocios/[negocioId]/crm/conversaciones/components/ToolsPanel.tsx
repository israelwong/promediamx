// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/components/ToolsPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle, Tag, Settings2, Archive, Play, Pause, Loader2, ExternalLink, ChevronDown } from 'lucide-react';
import {
    obtenerDetallesConversacionParaPanelAction,
    obtenerLeadDetallesCompletosAction,
    obtenerEtiquetasCrmNegocioAction,
    obtenerEtiquetasAsignadasLeadAction,
    actualizarEtiquetasLeadAction,
    obtenerAgentesCrmNegocioAction,
    asignarAgenteConversacionAction
} from '@/app/admin/_lib/crmConversacion.actions'; // Ajusta ruta si es necesario
import {
    pausarAutomatizacionAction,
    reanudarAutomatizacionAction,
    // --- Importar la nueva acción ---
    archivarConversacionAction
} from '@/app/admin/_lib/crmConversacion.actions'; // Ajusta ruta si es necesario
import {
    ConversationDetailsForPanel,
    LeadDetailsForPanel,
    EtiquetaCrmItem,
} from '@/app/admin/_lib/crmConversacion.types';
import { AgenteBasico } from '@/app/admin/_lib/agente.types';
import { UsuarioExtendido } from '@/app/admin/_lib/types';


import { useRouter } from 'next/navigation';
import { verifyToken } from '@/app/lib/auth';
import Cookies from 'js-cookie';

interface ToolsPanelProps {
    conversacionId: string;
    negocioId: string;
    clienteId: string;
    onActionComplete: () => void;
}

export default function ToolsPanel({ conversacionId, negocioId, clienteId, onActionComplete }: ToolsPanelProps) {
    const [leadDetails, setLeadDetails] = useState<LeadDetailsForPanel | null>(null);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanel | null>(null);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<EtiquetaCrmItem[]>([]);
    const [etiquetasSeleccionadasIds, setEtiquetasSeleccionadasIds] = useState<string[]>([]);
    const [agentesDisponibles, setAgentesDisponibles] = useState<AgenteBasico[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [isAssigningAgent, setIsAssigningAgent] = useState(false);
    const [isUpdatingPauseResume, setIsUpdatingPauseResume] = useState(false);
    // --- Nuevo estado para Archivar ---
    const [isArchiving, setIsArchiving] = useState(false);
    // ---
    const [error, setError] = useState<string | null>(null);

    const [user, setUser] = useState<UsuarioExtendido | null>(null); // Estado para el usuario logueado
    const token = Cookies.get('token');
    const router = useRouter();

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

    const currentUserId = user?.id;
    const currentUserName = user?.username || "Usuario";

    const loadInitialData = useCallback(async () => {
        // ... (lógica loadInitialData sin cambios) ...
        if (!conversacionId) { setError("ID inválido."); setIsLoading(false); return; }
        setIsLoading(true); setError(null);
        const [convDetailsResult, etiquetasNegocioResult, agentesNegocioResult] = await Promise.all([obtenerDetallesConversacionParaPanelAction(conversacionId), obtenerEtiquetasCrmNegocioAction(negocioId), obtenerAgentesCrmNegocioAction(negocioId)]);
        let currentLeadId: string | null | undefined = null;
        if (convDetailsResult.success && convDetailsResult.data) { setConversationDetails(convDetailsResult.data); currentLeadId = convDetailsResult.data.leadId; }
        else { setError(prev => prev ? `${prev}\n${convDetailsResult.error || 'Err conv.'}` : convDetailsResult.error || 'Err conv.'); }
        if (etiquetasNegocioResult.success && etiquetasNegocioResult.data) { setEtiquetasDisponibles(etiquetasNegocioResult.data); }
        else { console.error("Err etiquetas CRM:", etiquetasNegocioResult.error); setError(prev => prev ? `${prev}\n${etiquetasNegocioResult.error || 'Err etiq.'}` : etiquetasNegocioResult.error || 'Err etiq.'); }
        if (agentesNegocioResult.success && agentesNegocioResult.data) { setAgentesDisponibles(agentesNegocioResult.data); }
        else { console.error("Err agentes CRM:", agentesNegocioResult.error); setError(prev => prev ? `${prev}\n${agentesNegocioResult.error || 'Err agen.'}` : agentesNegocioResult.error || 'Err agen.'); }
        if (currentLeadId) {
            const [leadDetailsResult, etiquetasAsignadasResult] = await Promise.all([obtenerLeadDetallesCompletosAction(currentLeadId), obtenerEtiquetasAsignadasLeadAction(currentLeadId)]);
            if (leadDetailsResult.success && leadDetailsResult.data) { setLeadDetails(leadDetailsResult.data); }
            else { console.error("Err detalles lead:", leadDetailsResult.error); setError(prev => prev ? `${prev}\n${leadDetailsResult.error || 'Err lead.'}` : leadDetailsResult.error || 'Err lead.'); }
            if (etiquetasAsignadasResult.success && etiquetasAsignadasResult.data) { setEtiquetasSeleccionadasIds(etiquetasAsignadasResult.data); }
            else { console.error("Err etiq. asignadas:", etiquetasAsignadasResult.error); setError(prev => prev ? `${prev}\n${etiquetasAsignadasResult.error || 'Err etiq. asig.'}` : etiquetasAsignadasResult.error || 'Err etiq. asig.'); }
        } else { setLeadDetails(null); setEtiquetasSeleccionadasIds([]); }
        setIsLoading(false);
    }, [conversacionId, negocioId]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData, conversacionId]); // Dependencia correcta

    const handleTogglePauseResume = async (action: 'pause' | 'resume') => { /* ... (sin cambios) ... */
        if (!conversationDetails || !currentUserId) { setError("Falta info conv/usuario."); return; }
        setIsUpdatingPauseResume(true); setError(null);
        const actionFunction = action === 'pause' ? pausarAutomatizacionAction : reanudarAutomatizacionAction;
        const result = await actionFunction(conversationDetails.id, currentUserId, currentUserName);
        if (result.success && result.data) { setConversationDetails(result.data); onActionComplete(); }
        else { setError(result.error || `Error al ${action} automatización.`); }
        setIsUpdatingPauseResume(false);
    };

    const handleToggleEtiqueta = async (etiquetaId: string) => { /* ... (sin cambios) ... */
        if (!leadDetails || !conversationDetails) return;
        const currentSelectedIds = etiquetasSeleccionadasIds;
        const nuevasEtiquetasSeleccionadas = currentSelectedIds.includes(etiquetaId) ? currentSelectedIds.filter(id => id !== etiquetaId) : [...currentSelectedIds, etiquetaId];
        setEtiquetasSeleccionadasIds(nuevasEtiquetasSeleccionadas);
        setIsUpdatingTags(true); setError(null);
        const result = await actualizarEtiquetasLeadAction(leadDetails.id, nuevasEtiquetasSeleccionadas, conversationDetails.id, currentUserName);
        if (!result.success) { setError(result.error || 'Error actualizando etiquetas.'); setEtiquetasSeleccionadasIds(currentSelectedIds); }
        else { onActionComplete(); }
        setIsUpdatingTags(false);
    };

    const handleAssignAgent = async (event: React.ChangeEvent<HTMLSelectElement>) => { /* ... (sin cambios) ... */
        const newAgentId = event.target.value; if (!conversationDetails) return;
        setIsAssigningAgent(true); setError(null);
        const result = await asignarAgenteConversacionAction(conversationDetails.id, newAgentId === "null" || newAgentId === "" ? null : newAgentId, currentUserName);
        if (result.success && result.data) { setConversationDetails(result.data); onActionComplete(); }
        else { setError(result.error || 'Error al asignar agente.'); }
        setIsAssigningAgent(false);
    };

    // --- NUEVA FUNCIÓN: Manejar Archivar ---
    const handleArchiveConversation = async () => {

        if (!conversationDetails || !currentUserId) {
            setError("No se puede archivar: falta información de conversación o usuario.");
            return;
        }

        setIsArchiving(true);
        setError(null);

        const result = await archivarConversacionAction(
            conversationDetails.id,
            currentUserId,
            conversationDetails.agenteCrmActual?.id || null, // Pass the agent ID or null
            currentUserName
        );

        if (result.success) {
            onActionComplete();
            // alert("Conversación archivada exitosamente."); // O usar un toast/notificación
        } else {
            setError(result.error || "Error al archivar la conversación.");
        }
        setIsArchiving(false);
    };
    // --- FIN NUEVA FUNCIÓN ---

    const buttonBaseClasses = "w-full text-sm font-medium px-3 py-2 rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60";
    const buttonSecondaryClasses = `${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-500`;
    // const buttonDangerClasses = `${buttonBaseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
    // Añadir clase para botón de archivar
    const buttonArchiveClasses = `${buttonBaseClasses} bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-400`;


    if (isLoading) { /* ... (loading state sin cambios) ... */
        return (<div className="flex flex-col items-center justify-center h-full"><Loader2 size={28} className="animate-spin text-zinc-400" /><p className="text-zinc-500 mt-2 text-sm">Cargando...</p></div>);
    }

    const leadProfileUrl = leadDetails ? `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${leadDetails.id}` : '#';
    const currentAssignedAgentId = conversationDetails?.agenteCrmActual?.id || "";
    const isPaused = conversationDetails?.status === 'en_espera_agente' || conversationDetails?.status === 'hitl_activo';
    // Añadir verificación para estado archivado
    const isArchived = conversationDetails?.status === 'archivada';

    return (
        <div className="space-y-5">
            {error && <div className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-sm mb-4 whitespace-pre-line">{error}</div>}

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
        </div>
    );
}
