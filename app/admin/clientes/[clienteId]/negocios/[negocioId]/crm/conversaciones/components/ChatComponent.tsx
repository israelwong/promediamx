// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Send, Paperclip, Loader2, User, Bot, MessageSquareWarning, ShieldCheck } from 'lucide-react'; // Añadir ShieldCheck para admin
import { createClient, SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';
import {
    obtenerMensajesConversacionAction,
    enviarMensajeAction,
    obtenerDetallesConversacionParaPanelAction
} from '@/app/admin/_lib/crmConversacion.actions';
import {
    ChatMessageItem,
    EnviarMensajeInput,
    ConversationDetailsForPanel as ConversationDetails
} from '@/app/admin/_lib/crmConversacion.types';
import { AgenteBasico } from '@/app/admin/_lib/agente.types';
import { UsuarioExtendido } from '@/app/admin/_lib/types';
import { verifyToken } from '@/app/lib/auth';
import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/crmAgente.actions';

const token = Cookies.get('token');

// --- Constante para el Rol de Administrador ---
const ADMIN_ROLE_NAME = 'Administrador';

interface InteraccionRealtimePayload { /* ... */
    id: string; conversacionId: string; role: string; mensaje: string | null; mediaUrl?: string | null; mediaType?: string | null; createdAt: string; agenteCrmId?: string | null;
}

interface ChatComponentProps {
    conversacionId: string;
    negocioId: string;
    refreshTrigger: number;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') { /* ... inicialización supabase ... */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
    else console.warn("[ChatComponent] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
}


export default function ChatComponent({ conversacionId, negocioId, refreshTrigger }: ChatComponentProps) {
    const [messages, setMessages] = useState<ChatMessageItem[]>([]);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const fileInputRef = useRef<null | HTMLInputElement>(null);
    const router = useRouter();
    const params = useParams();
    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [currentAgentInfo, setCurrentAgentInfo] = useState<AgenteBasico | null>(null);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true); // Renombrado para incluir todas las verificaciones
    const [isOwner, setIsOwner] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const currentConversationId = conversacionId; // Renombrado para mayor claridad


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

    // useEffect para Buscar Agente, Verificar Propietario y Verificar Admin
    useEffect(() => {
        const clienteIdFromRoute = params?.clienteId as string | undefined;

        async function checkPermissions() {
            if (user?.id && negocioId && clienteIdFromRoute && isLoadingPermissions) {
                setError(null);
                setIsOwner(false);
                setCurrentAgentInfo(null);
                setIsAdmin(false); // Resetear estado admin

                let canSendMessages = false; // Flag para saber si tiene algún permiso

                // 1. Verificar si es Administrador (usando rolNombre del token)
                if (user.rolNombre === ADMIN_ROLE_NAME) {
                    console.log(`[ChatComponent] Usuario ${user.id} es Administrador.`);
                    setIsAdmin(true);
                    canSendMessages = true;
                }

                // 2. Verificar si es el Propietario
                if (user.id === clienteIdFromRoute) {
                    console.log(`[ChatComponent] Usuario ${user.id} es el propietario del negocio ${negocioId}.`);
                    setIsOwner(true);
                    canSendMessages = true;
                }

                // 3. Buscar si es un Agente del CRM (incluso si es admin o propietario)
                console.log(`[ChatComponent] Buscando Agente para Usuario ${user.id} en Negocio ${negocioId}`);
                const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);

                if (result.success) {
                    if (result.data) {
                        console.log("[ChatComponent] Agente CRM encontrado:", result.data);
                        setCurrentAgentInfo(result.data);
                        canSendMessages = true;
                    } else {
                        console.warn(`[ChatComponent] Usuario ${user.username} (${user.id}) no es Agente activo en CRM ${negocioId}.`);
                        setCurrentAgentInfo(null);
                    }
                } else {
                    console.error("[ChatComponent] Error al buscar agente:", result.error);
                    // Mostrar error solo si no tiene NINGÚN otro permiso
                    if (!canSendMessages) {
                        setError(prev => prev || result.error || "Error buscando información del agente.");
                    }
                    setCurrentAgentInfo(null);
                }

                // 4. Establecer error final si no tiene ningún permiso
                if (!canSendMessages) {
                    setError("No tienes permiso para enviar mensajes en este chat (no eres propietario, agente asignado ni administrador).");
                }

                setIsLoadingPermissions(false); // Terminar carga de permisos
            } else if (!user?.id || !negocioId || !clienteIdFromRoute) {
                setIsLoadingPermissions(false);
                setCurrentAgentInfo(null);
                setIsOwner(false);
                setIsAdmin(false);
                if (user !== null) {
                    setError("No se pudo determinar la autorización para enviar mensajes.");
                }
            }
        }

        if (user !== null) { // Solo ejecutar cuando el usuario esté cargado
            checkPermissions();
        }

    }, [user, negocioId, params?.clienteId, isLoadingPermissions]); // Depender también de isLoadingPermissions

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages, scrollToBottom]);

    const fetchChatData = useCallback(async () => {
        console.log(`[ChatComponent] fetchChatData: ${conversacionId}`);
        if (!conversacionId) { setIsLoading(false); setError(prev => prev || "ID inválido."); return; }
        if (messages.length === 0 && !isLoading) setIsLoading(true);

        const [messagesResult, detailsResult] = await Promise.all([obtenerMensajesConversacionAction(conversacionId), obtenerDetallesConversacionParaPanelAction(conversacionId)]);

        if (messagesResult.success && messagesResult.data) {
            setMessages(messagesResult.data.map(m => ({ ...m, createdAt: new Date(m.createdAt) })));
            // Limpiar error de carga si los mensajes cargan bien, pero mantener error de permisos si existe
            setError(prev => prev?.includes("permiso") ? prev : null);
        } else {
            setError(prev => prev || messagesResult.error || 'Error mensajes.');
            setMessages([]);
        }
        if (detailsResult.success && detailsResult.data) { setConversationDetails(detailsResult.data); }
        else { console.error("Error detalles:", detailsResult.error); }

        // Solo finalizar loading general si también terminó la carga de permisos
        if (!isLoadingPermissions) {
            setIsLoading(false);
        }
    }, [conversacionId, messages.length, isLoading, isLoadingPermissions]); // Añadir isLoadingPermissions

    useEffect(() => {
        console.log(`[ChatComponent] useEffect fetchChatData. convId: ${conversacionId}, trigger: ${refreshTrigger}`);
        // No llamar a fetch si aún estamos cargando permisos
        if (!isLoadingPermissions) {
            fetchChatData();
        }
    }, [conversacionId, refreshTrigger, fetchChatData, isLoadingPermissions]); // Añadir isLoadingPermissions

    // useEffect para Supabase Realtime
    useEffect(() => {
        if (!supabase || !currentConversationId) { console.log("[ChatComponent Realtime] No suscrito."); return; }
        const channelName = `interacciones-conv-${currentConversationId}`;
        console.log(`[ChatComponent Realtime] Suscribiendo a: ${channelName}`);
        const channel: RealtimeChannel = supabase.channel(channelName)
            .on<RealtimePostgresChangesPayload<InteraccionRealtimePayload>>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Interaccion', filter: `conversacionId=eq.${currentConversationId}` },
                (payload) => { /* ... (lógica interna sin cambios) ... */
                    console.log('[ChatComponent Realtime] Payload INSERT recibido:', payload);
                    if (payload.eventType === 'INSERT' && payload.new && 'id' in payload.new) {
                        const nuevaInteraccion = payload.new as unknown as InteraccionRealtimePayload;
                        setMessages(prevMessages => {
                            if (prevMessages.some(msg => msg.id === nuevaInteraccion.id)) return prevMessages;
                            try {
                                const role = ['user', 'assistant', 'agent', 'system'].includes(nuevaInteraccion.role) ? nuevaInteraccion.role as ChatMessageItem['role'] : 'system';
                                const agenteCrmData: AgenteBasico | null = nuevaInteraccion.agenteCrmId ? { id: nuevaInteraccion.agenteCrmId, nombre: null } : null;
                                const nuevaChatMessage: ChatMessageItem = { id: nuevaInteraccion.id, conversacionId: nuevaInteraccion.conversacionId, role: role, mensaje: nuevaInteraccion.mensaje ?? null, mediaUrl: nuevaInteraccion.mediaUrl ?? undefined, mediaType: nuevaInteraccion.mediaType ?? undefined, createdAt: new Date(nuevaInteraccion.createdAt), agenteCrm: agenteCrmData };
                                console.log('[ChatComponent Realtime] Añadiendo mensaje:', nuevaChatMessage);
                                return [...prevMessages, nuevaChatMessage];
                            } catch (error) { console.error("[ChatComponent Realtime] Error procesando mensaje:", error, payload); return prevMessages; }
                        });
                    }
                }
            )
            .subscribe((status, err) => { if (status === 'SUBSCRIBED') console.log(`Suscrito a ${channelName}`); else if (err) console.error(`Error canal ${channelName}:`, err); else console.log(`Estado canal ${channelName}: ${status}`); });
        return () => { if (supabase && channel) { console.log(`Desuscribiendo de ${channelName}`); supabase.removeChannel(channel).catch(console.error); } };
    }, [currentConversationId]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !fileInputRef.current?.files?.length) return;

        // --- CORRECCIÓN: Permitir enviar si es Agente O Propietario O Admin ---
        const canSend = currentAgentInfo?.id || isOwner || isAdmin;
        if (!canSend) {
            setError("Error: No tienes permiso para enviar mensajes en esta conversación.");
            console.error("Intento de envío sin permiso (agente/propietario/admin).");
            return;
        }
        // Determinar el ID a enviar (el del agente si existe, sino null)
        // El admin y el propietario envían con ID null para no suplantar a un agente específico
        const senderAgentId = currentAgentInfo?.id || null;
        // --- FIN CORRECCIÓN ---

        setIsSending(true);
        setError(null);
        const textToSend = newMessage.trim();

        const input: EnviarMensajeInput = {
            conversacionId: conversacionId,
            mensaje: textToSend,
            role: 'agent', // Humano siempre envía como 'agent'
            agenteCrmId: senderAgentId, // ID del agente o null si es propietario/admin
        };

        setNewMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        console.log("[ChatComponent] Enviando mensaje como humano:", input);
        const result = await enviarMensajeAction(input);
        setIsSending(false);

        if (result.success && result.data) {
            console.log("Mensaje humano enviado por action, esperando Realtime:", result.data);
        } else {
            setError(result.error || 'Error al enviar mensaje. Inténtalo de nuevo.');
            setNewMessage(textToSend);
        }
    };

    // --- CORRECCIÓN: Usar nombre del Agente, Propietario (user.username) o Admin (user.username) ---
    const getMessageSenderIcon = (role: ChatMessageItem['role'], agente?: AgenteBasico | null) => {
        let agentDisplayName = "Humano"; // Default
        if (agente?.id === currentAgentInfo?.id) { // Si es el agente actual
            agentDisplayName = currentAgentInfo?.nombre || user?.username || "Agente";
        } else if (agente) { // Si es OTRO agente (vino con el mensaje)
            agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`;
        } else if (isOwner || isAdmin) { // Si NO hay agenteCrmId en el mensaje Y el usuario actual es owner/admin
            agentDisplayName = user?.username || (isAdmin ? "Admin" : "Propietario");
        }

        const displayName =
            role === 'user' ? conversationDetails?.leadNombre :
                (role === 'assistant' ? 'Asistente IA' : agentDisplayName);

        if (role === 'user') return <span title={displayName || 'Usuario'}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || 'Asistente'}><Bot size={18} className="text-zinc-400" /></span>;
        // Usar ícono diferente para admin si se desea
        if (role === 'agent' && agente?.id === currentAgentInfo?.id && isAdmin && !isOwner) {
            return <span title={`${displayName} (Admin)`}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        }
        if (role === 'agent') return <span title={displayName ?? undefined}>
            <User size={18} className="text-purple-300" />
        </span>;
        return null;
    };
    // --- FIN CORRECCIÓN ---

    const copiarIdConversacion = (id: string) => { /* ... */ navigator.clipboard.writeText(id); setMensajeCopiado('ID copiado'); setTimeout(() => { setMensajeCopiado(null); }, 2000); };
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

    // Determinar si el input/botón de envío debe estar deshabilitado
    const canSendPermission = currentAgentInfo?.id || isOwner || isAdmin;
    const isSendDisabled = isSending || isLoadingPermissions || !canSendPermission;

    function getMessageAlignment(role: string) {
        switch (role) {
            case 'user':
                return 'items-end'; // Align messages from the user to the right
            case 'assistant':
            case 'agent':
                return 'items-start'; // Align messages from the assistant or agent to the left
            case 'system':
                return 'items-center'; // Center-align system messages
            default:
                return 'items-start'; // Default alignment for unknown roles
        }
    }
    function getMessageBgColor(role: string) {
        switch (role) {
            case 'user':
                return 'bg-blue-800 text-blue-100'; // Background and text color for user messages
            case 'assistant':
                return 'bg-zinc-700 text-zinc-100'; // Background and text color for assistant messages
            case 'agent':
                return 'bg-purple-700 text-purple-100'; // Background and text color for agent messages
            case 'system':
                return 'bg-zinc-600 text-zinc-200'; // Background and text color for system messages
            default:
                return 'bg-zinc-800 text-zinc-100'; // Default background and text color
        }
    }
    return (
        <div className="flex flex-col h-full" style={{ maxHeight: '80vh' }}>
            {/* ... (Header sin cambios) ... */}
            <div className="p-3 md:p-4 border-b border-zinc-700 bg-zinc-800 flex-shrink-0 justify-between flex items-center"><h4 className="text-base md:text-lg font-semibold text-zinc-100">Chat con {conversationDetails?.leadNombre || 'Contacto'}</h4><div>{mensajeCopiado && (<span className="text-xs text-zinc-300 mr-2">{mensajeCopiado}</span>)}<span className="text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded-md" onClick={() => copiarIdConversacion(conversacionId)} title="Copiar ID">{conversacionId.substring(0, 8)}...</span></div></div>

            {/* Área de Mensajes */}
            <div className="flex-1 min-h-0 p-3 md:p-4 space-y-3 overflow-y-auto bg-zinc-900">
                {(isLoading || isLoadingPermissions) && messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="text-zinc-500 mt-2">Cargando...</p></div>)}
                {!isLoading && !isLoadingPermissions && error && messages.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-red-400"><MessageSquareWarning size={32} className="mb-2" /><p className="font-medium">Error:</p><p className="text-sm">{error}</p></div>)}

                {messages.map((msg) => (<div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'items-center' : ''}`}>{msg.role !== 'system' ? (<div className={`flex items-end gap-2 max-w-[70%] md:max-w-[60%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>{(msg.role === 'assistant' || msg.role === 'agent') && (<span className={`flex-shrink-0 self-center p-1.5 rounded-full ${msg.role === 'agent' ? 'bg-purple-700' : 'bg-zinc-700'}`}>{getMessageSenderIcon(msg.role, msg.agenteCrm)}</span>)}<div className={`p-2.5 md:p-3 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>{(msg.role === 'assistant' || msg.role === 'agent') && (<div className="flex items-center gap-1.5 mb-1 text-xs font-medium"><span className={`${msg.role === 'agent' ? 'text-purple-300' : 'text-zinc-400'}`}>{/* Mostrar nombre del agente que envió si existe, sino el actual */} {msg.agenteCrm?.nombre || (msg.role === 'agent' ? (currentAgentInfo?.nombre || user?.username || 'Humano') : 'Asistente IA')}</span></div>)}{msg.mensaje && <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>}</div>{msg.role === 'user' && (<span className="flex-shrink-0 text-blue-300 self-center p-1.5 bg-blue-800 rounded-full">{getMessageSenderIcon(msg.role, msg.agenteCrm)}</span>)}</div>) : (<div className={getMessageBgColor(msg.role)}>{msg.mensaje}</div>)}<span className={`text-xs text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : (msg.role === 'system' ? 'self-center' : 'self-start')}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>))}<div ref={messagesEndRef} /></div>

            {/* Formulario de Envío */}
            <form
                onSubmit={handleSendMessage}
                className="p-3 md:p-4 border-t border-zinc-700 bg-zinc-800 flex-shrink-0"
            >
                {error && !isSending && <p className="text-xs text-red-400 mb-2">{error}</p>}
                <div className="flex items-center gap-2 md:gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Adjuntar archivo"><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={() => {/* TODO */ }} />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Escribe un mensaje como Agente..."
                        className="flex-grow px-3 py-2.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500"
                        disabled={isSendDisabled}
                    />
                    <button
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSendDisabled || (!newMessage.trim() && (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0))}
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        <span className="hidden sm:inline">Enviar</span>
                    </button>
                </div>
                {/* Mostrar estado de carga de permisos o si no tiene permiso */}
                {isLoadingPermissions && <p className="text-xs text-zinc-400 mt-1">Verificando permisos...</p>}
                {!isLoadingPermissions && !canSendPermission && user !== null && <p className="text-xs text-amber-400 mt-1">No tienes permiso para enviar mensajes en este chat.</p>}
            </form>
        </div>
    );
}