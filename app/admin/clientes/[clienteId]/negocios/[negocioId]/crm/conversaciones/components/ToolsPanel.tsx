// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/components/ToolsPanel.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserCircle, Tag, Settings2, Archive, Play, Pause, Loader2, ExternalLink, ChevronDown } from 'lucide-react'; // Importar Play, Pause
import {
    obtenerDetallesConversacionParaPanelAction,
    obtenerLeadDetallesCompletosAction,
    obtenerEtiquetasCrmNegocioAction,
    obtenerEtiquetasAsignadasLeadAction,
    actualizarEtiquetasLeadAction,
    // actualizarEstadoConversacionAction, // Ya no se usa para pausar/reanudar
    obtenerAgentesCrmNegocioAction,
    asignarAgenteConversacionAction
    // Asegúrate que la ruta sea correcta según tu refactorización o decisión final
} from '@/app/admin/_lib/crmConversacion.actions';
// Importar las nuevas acciones de pausa/reanudación
import {
    pausarAutomatizacionAction,
    reanudarAutomatizacionAction
} from '@/app/admin/_lib/crmConversacion.actions'; // Ajusta la ruta si es necesario
import {
    ConversationDetailsForPanel,
    LeadDetailsForPanel,
    EtiquetaCrmItem,
} from '@/app/admin/_lib/crmConversacion.types';
import { AgenteBasico } from '@/app/admin/_lib/agente.types';
// --- Importar hook de autenticación (o tu método) ---
import { verifyToken } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { UsuarioExtendido } from '@/app/admin/_lib/types'; // Asegúrate de que la ruta sea correcta
// ---

interface ToolsPanelProps {
    conversacionId: string;
    negocioId: string;
    clienteId: string; // Necesario para link a Lead
    onActionComplete: () => void;
}

export default function ToolsPanel({ conversacionId, negocioId, clienteId, onActionComplete }: ToolsPanelProps) {
    const [leadDetails, setLeadDetails] = useState<LeadDetailsForPanel | null>(null);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanel | null>(null);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<EtiquetaCrmItem[]>([]);
    const [etiquetasSeleccionadasIds, setEtiquetasSeleccionadasIds] = useState<string[]>([]);
    const [agentesDisponibles, setAgentesDisponibles] = useState<AgenteBasico[]>([]);
    const router = useRouter();
    const [user, setUser] = useState<UsuarioExtendido | null>(null); // Estado para el usuario logueado

    const [isLoading, setIsLoading] = useState(true);
    // const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // Reemplazado
    const [isUpdatingTags, setIsUpdatingTags] = useState(false);
    const [isAssigningAgent, setIsAssigningAgent] = useState(false);
    // --- Nuevo estado para Pausa/Reanudar ---
    const [isUpdatingPauseResume, setIsUpdatingPauseResume] = useState(false);
    const token = Cookies.get('token');
    // ---
    const [error, setError] = useState<string | null>(null);

    // Obtener usuario/agente actual

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
    }, [router]);

    const currentUserId = user?.id; // ID del Usuario logueado
    const currentUserName = user?.username || "Usuario"; // Nombre del Usuario logueado

    const loadInitialData = useCallback(async () => {
        // ... (lógica loadInitialData sin cambios) ...
        if (!conversacionId) { setError("ID de conversación no válido."); setIsLoading(false); return; }
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

    // --- NUEVA FUNCIÓN: Manejar Pausa/Reanudación ---
    const handleTogglePauseResume = async (action: 'pause' | 'resume') => {
        if (!conversationDetails || !currentUserId) {
            setError("No se puede realizar la acción: falta información de conversación o usuario.");
            return;
        }

        setIsUpdatingPauseResume(true);
        setError(null);

        const actionFunction = action === 'pause' ? pausarAutomatizacionAction : reanudarAutomatizacionAction;
        const result = await actionFunction(
            conversationDetails.id,
            currentUserId, // ID del usuario/agente que realiza la acción
            currentUserName // Nombre del usuario/agente
        );

        if (result.success && result.data) {
            setConversationDetails(result.data); // Actualizar estado local con la respuesta
            onActionComplete(); // Notificar al padre para refrescar chat si es necesario
        } else {
            setError(result.error || `Error al ${action === 'pause' ? 'pausar' : 'reanudar'} automatización.`);
        }
        setIsUpdatingPauseResume(false);
    };
    // --- FIN NUEVA FUNCIÓN ---


    const handleToggleEtiqueta = async (etiquetaId: string) => { /* ... (sin cambios) ... */
        if (!leadDetails || !conversationDetails) return;
        const currentSelectedIds = etiquetasSeleccionadasIds;
        const nuevasEtiquetasSeleccionadas = currentSelectedIds.includes(etiquetaId) ? currentSelectedIds.filter(id => id !== etiquetaId) : [...currentSelectedIds, etiquetaId];
        setEtiquetasSeleccionadasIds(nuevasEtiquetasSeleccionadas);
        setIsUpdatingTags(true); setError(null);
        const result = await actualizarEtiquetasLeadAction(leadDetails.id, nuevasEtiquetasSeleccionadas, conversationDetails.id, currentUserName // Usar nombre del usuario actual
        );
        if (!result.success) { setError(result.error || 'Error actualizando etiquetas.'); setEtiquetasSeleccionadasIds(currentSelectedIds); }
        else { onActionComplete(); }
        setIsUpdatingTags(false);
    };

    const handleAssignAgent = async (event: React.ChangeEvent<HTMLSelectElement>) => { /* ... (sin cambios) ... */
        const newAgentId = event.target.value; if (!conversationDetails) return;
        setIsAssigningAgent(true); setError(null);
        const result = await asignarAgenteConversacionAction(conversationDetails.id, newAgentId === "null" || newAgentId === "" ? null : newAgentId, currentUserName // Usar nombre del usuario actual
        );
        if (result.success && result.data) { setConversationDetails(result.data); onActionComplete(); }
        else { setError(result.error || 'Error al asignar agente.'); }
        setIsAssigningAgent(false);
    };

    // Clases de botones (sin cambios)
    const buttonBaseClasses = "w-full text-sm font-medium px-3 py-2 rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60";
    const buttonSecondaryClasses = `${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-500`;
    const buttonDangerClasses = `${buttonBaseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;

    if (isLoading) { /* ... (loading state sin cambios) ... */
        return (<div className="flex flex-col items-center justify-center h-full"><Loader2 size={28} className="animate-spin text-zinc-400" /><p className="text-zinc-500 mt-2 text-sm">Cargando...</p></div>);
    }

    const leadProfileUrl = leadDetails ? `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${leadDetails.id}` : '#';
    const currentAssignedAgentId = conversationDetails?.agenteCrmActual?.id || "";

    // Determinar si la IA está pausada
    const isPaused = conversationDetails?.status === 'en_espera_agente' || conversationDetails?.status === 'hitl_activo'; // Añadir otros estados de pausa si existen

    return (
        <div className="space-y-5">
            {error && <div className="p-3 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 text-sm mb-4 whitespace-pre-line">{error}</div>}

            {/* Detalles del Contacto */}
            <section>
                <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><UserCircle size={18} /> Detalles del Contacto</h4>
                {/* ... (renderizado detalles lead sin cambios) ... */}
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
                            {/* ... (select de agente sin cambios) ... */}
                            <div className="relative"><select id="assignAgent" key={currentAssignedAgentId} value={currentAssignedAgentId} onChange={handleAssignAgent} disabled={isAssigningAgent || agentesDisponibles.length === 0} className="w-full text-xs p-2 rounded-md appearance-none bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950"><option value="">-- Sin asignar --</option>{agentesDisponibles.map(agente => (<option key={agente.id} value={agente.id}>{agente.nombre}</option>))}</select><ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />{isAssigningAgent && <Loader2 size={16} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}</div>{conversationDetails.agenteCrmActual && (<p className="text-xs text-zinc-500 mt-1">Asignado a: {conversationDetails.agenteCrmActual.nombre}</p>)}
                        </div>

                        {/* --- CORRECCIÓN: Botones Pausar/Reanudar --- */}
                        {isPaused ? ( // Si está pausada, mostrar botón de Reanudar
                            <button
                                onClick={() => handleTogglePauseResume('resume')}
                                className={buttonSecondaryClasses}
                                disabled={isUpdatingPauseResume}
                            >
                                {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                                Reanudar Automatización
                            </button>
                        ) : ( // Si no está pausada (ej. 'abierta'), mostrar botón de Pausar
                            // Opcional: No mostrar si ya está cerrada
                            conversationDetails.status !== 'cerrada' && (
                                <button
                                    onClick={() => handleTogglePauseResume('pause')}
                                    className={buttonSecondaryClasses}
                                    disabled={isUpdatingPauseResume}
                                >
                                    {isUpdatingPauseResume ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                                    Pausar (Intervención Humana)
                                </button>
                            )
                        )}
                        {/* --- FIN CORRECCIÓN --- */}

                        {/* Botón Cerrar (sin cambios) */}
                        {conversationDetails.status !== 'cerrada' && (
                            <button
                                onClick={() => {/* Lógica para cerrar - podrías usar actualizarEstadoConversacionAction */ }}
                                className={buttonDangerClasses}
                                disabled={isUpdatingPauseResume} // Podrías usar un estado separado si prefieres
                            >
                                <Archive size={16} /> Marcar como Cerrada
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/* Etiquetas del Lead */}
            {leadDetails && (
                <section>
                    <h4 className="text-sm font-semibold text-zinc-100 mb-2 flex items-center gap-2"><Tag size={18} /> Etiquetas del Lead</h4>
                    {/* ... (renderizado etiquetas sin cambios) ... */}
                    {etiquetasDisponibles.length > 0 ? (<div className="flex flex-wrap gap-1.5">{etiquetasDisponibles.map(etiqueta => { const isSelected = etiquetasSeleccionadasIds.includes(etiqueta.id); return (<button key={etiqueta.id} onClick={() => handleToggleEtiqueta(etiqueta.id)} className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 ${isSelected ? 'text-white border-transparent' : 'text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 focus:ring-zinc-500'}`} style={{ backgroundColor: isSelected ? (etiqueta.color || '#6366f1') : 'transparent', borderColor: isSelected ? (etiqueta.color || '#6366f1') : (etiqueta.color ? etiqueta.color + '99' : undefined), color: isSelected ? 'white' : (etiqueta.color || undefined) }} disabled={isUpdatingTags}>{isUpdatingTags && etiquetasSeleccionadasIds.includes(etiqueta.id) !== isSelected ? <Loader2 size={12} className="animate-spin mr-1" /> : null}{etiqueta.nombre}</button>); })}</div>) : <p className="text-xs text-zinc-500">No hay etiquetas configuradas.</p>}
                </section>
            )}
        </div>
    );
}
