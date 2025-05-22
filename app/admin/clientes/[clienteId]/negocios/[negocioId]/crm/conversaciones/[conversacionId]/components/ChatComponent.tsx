'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Send, Paperclip, Loader2, User, Bot, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'; // RealtimePostgresChangesPayload no es necesaria aquí
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';
// import Image from 'next/image'; // Import Image

// --- NUEVAS IMPORTS ---
import {
    obtenerMensajesAction,
    enviarMensajeConversacionAction, // Nombre de la nueva action
    obtenerDetallesConversacionAction, // Nueva action refactorizada
} from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type {
    ChatMessageItemData,
    EnviarMensajeParams,
    ConversationDetailsForPanelData, // Tipo de Zod
    AgenteBasicoData // Tipo de Zod
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

// Mantener esta si la lógica de agente es compleja y separada, o refactorizarla también.
import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/crmAgente.actions';
// import type { AgenteBasico as OldAgenteBasico } from '@/app/admin/_lib/agente.types'; // Para la acción antigua

import type { UsuarioExtendido } from '@/app/admin/_lib/types'; // Asumo que está ok
import { verifyToken } from '@/app/lib/auth'; // Asumo que está ok
const token = Cookies.get('token');

// Definición de InteraccionRealtimePayload si es diferente a ChatMessageItemData
// Si es igual o muy similar, podrías reusar partes de ChatMessageItemData
interface InteraccionRealtimePayload {
    // Define los campos que realmente vienen del payload de Supabase
    id: string;
    conversacionId: string;
    role: string; // Puede ser string genérico del payload
    mensaje: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: string; // Supabase a menudo envía fechas como string ISO
    agenteCrmId?: string | null;
    // Si Supabase envía el objeto agenteCrm anidado:
    agenteCrm?: { id: string; nombre: string | null; } | null;
}


interface ChatComponentProps {
    conversacionId: string;
    negocioId: string;
    refreshTrigger: number;
}

// Supabase client (sin cambios)
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
    else console.warn("[ChatComponent] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
}

export default function ChatComponent({ conversacionId, negocioId, refreshTrigger }: ChatComponentProps) {
    // Usar el nuevo tipo inferido de Zod
    const [messages, setMessages] = useState<ChatMessageItemData[]>([]);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const fileInputRef = useRef<null | HTMLInputElement>(null);
    const router = useRouter();
    const params = useParams(); // Para clienteId

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [currentAgentInfo, setCurrentAgentInfo] = useState<AgenteBasicoData | null>(null); // Usar nuevo tipo Zod
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const currentConversationId = conversacionId;

    const ADMIN_ROLE_NAME = 'Administrador'; // Definir dentro del componente o importar


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
        // ... (lógica similar, pero usa currentAgentInfo con AgenteBasicoData) ...
        // La llamada a obtenerAgenteCrmPorUsuarioAction sigue igual por ahora.
        // Si esa acción se refactoriza, aquí se cambiaría.
        async function checkPermissions() {
            if (user?.id && negocioId && clienteIdFromRoute) { // Quitado isLoadingPermissions de aquí
                setIsLoadingPermissions(true); // Iniciar carga de permisos aquí
                setError(null); setIsOwner(false); setCurrentAgentInfo(null); setIsAdmin(false);
                let canSendMessages = false;

                if (user.rolNombre === ADMIN_ROLE_NAME) { setIsAdmin(true); canSendMessages = true; }
                if (user.id === clienteIdFromRoute) { setIsOwner(true); canSendMessages = true; }

                const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);
                if (result.success && result.data) {
                    // Asumir que result.data es compatible con AgenteBasicoData
                    // o realizar un mapeo/validación si es necesario
                    setCurrentAgentInfo(result.data as AgenteBasicoData); // Casting si es necesario
                    canSendMessages = true;
                } else if (!canSendMessages) { // Mostrar error de agente solo si no tiene otros permisos
                    setError(prev => prev || result.error || "Error buscando información del agente.");
                }
                if (!canSendMessages) { setError("No tienes permiso para enviar mensajes en este chat."); }
                setIsLoadingPermissions(false);
            } else if (user !== null) { // Si user está cargado pero faltan otros IDs
                setIsLoadingPermissions(false);
                setError("No se pudo determinar la autorización para enviar mensajes (faltan datos de contexto).");
            }
        }
        if (user) checkPermissions(); // Ejecutar solo si user ya está definido
        else if (user === null && Cookies.get('token')) { /* no hacer nada, esperar a que user se popule o validarToken falle */ }
        else if (!Cookies.get('token')) { setIsLoadingPermissions(false); /* No hay token, no hay usuario */ }

    }, [user, negocioId, params?.clienteId]);


    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages, scrollToBottom]);

    const fetchChatData = useCallback(async () => {
        if (!currentConversationId) { setIsLoading(false); setError(prev => prev || "ID de conversación inválido."); return; }

        // Solo mostrar spinner principal si no hay mensajes aún Y no estamos ya cargando
        if (messages.length === 0 && !isLoading) setIsLoading(true);

        // Usar la nueva obtenerDetallesConversacionAction para conversationDetails
        // Y la nueva obtenerMensajesAction para los mensajes
        const [messagesResult, detailsResult] = await Promise.all([
            obtenerMensajesAction({ conversacionId: currentConversationId, limit: 50 }),
            obtenerDetallesConversacionAction({ conversacionId: currentConversationId })
        ]);

        if (messagesResult.success && messagesResult.data) {
            setMessages(messagesResult.data); // Zod ya validó y Prisma devuelve Date
            // Limpiar error de carga si los mensajes cargan bien, pero mantener error de permisos si existe
            setError(prev => prev?.includes("permiso") ? prev : null);
        } else {
            setError(prev => prev || messagesResult.error || 'Error al cargar mensajes.');
            setMessages([]);
        }

        if (detailsResult.success && detailsResult.data) {
            setConversationDetails(detailsResult.data);
        } else {
            console.error("Error al cargar detalles de conversación:", detailsResult.error);
            // Podrías establecer un error específico para los detalles si es crítico
        }

        // Finalizar loading general cuando ambas cargas (mensajes y permisos) hayan terminado
        // Esto asume que la carga de permisos es independiente y rápida.
        // Si la carga de permisos es bloqueante para mostrar el chat, ajustar esta lógica.
        if (!isLoadingPermissions) { // O alguna otra condición que indique que los permisos ya se evaluaron
            setIsLoading(false);
        }

    }, [currentConversationId, messages.length, isLoading, isLoadingPermissions]); // Añadido isLoadingPermissions

    // useEffect para el trigger de refresco y carga inicial
    useEffect(() => {
        // No llamar a fetch si aún estamos cargando permisos la primera vez
        if (!isLoadingPermissions || refreshTrigger > 0) { // Permite refresco aunque los permisos estén cargando
            fetchChatData();
        }
    }, [currentConversationId, refreshTrigger, fetchChatData, isLoadingPermissions]);


    // useEffect para Supabase Realtime
    useEffect(() => {
        if (!supabase || !currentConversationId) return;
        const channelName = `interacciones-conv-${currentConversationId}`;
        const channel: RealtimeChannel = supabase.channel(channelName)
            .on<InteraccionRealtimePayload>( // Usar el tipo InteraccionRealtimePayload
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Interaccion', filter: `conversacionId=eq.${currentConversationId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT' && payload.new) {
                        const nuevaInteraccionRt = payload.new;
                        setMessages(prevMessages => {
                            if (prevMessages.some(msg => msg.id === nuevaInteraccionRt.id)) return prevMessages;

                            // Mapear el payload de realtime a ChatMessageItemData
                            // Asumiendo que agenteCrm es un objeto simple o null desde el payload
                            const agenteDelPayload = nuevaInteraccionRt.agenteCrmId && nuevaInteraccionRt.agenteCrm
                                ? { id: nuevaInteraccionRt.agenteCrm.id, nombre: nuevaInteraccionRt.agenteCrm.nombre || null }
                                : null;

                            const nuevaChatMessage: ChatMessageItemData = {
                                id: nuevaInteraccionRt.id,
                                conversacionId: nuevaInteraccionRt.conversacionId,
                                role: nuevaInteraccionRt.role as ChatMessageItemData['role'],
                                mensaje: nuevaInteraccionRt.mensaje ?? null,
                                mediaUrl: nuevaInteraccionRt.mediaUrl ?? undefined,
                                mediaType: nuevaInteraccionRt.mediaType ?? undefined,
                                createdAt: new Date(nuevaInteraccionRt.createdAt), // Convertir string a Date
                                agenteCrm: agenteDelPayload,
                            };
                            return [...prevMessages, nuevaChatMessage];
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

        const canSend = currentAgentInfo?.id || isOwner || isAdmin;
        if (!canSend) {
            setError("No tienes permiso para enviar mensajes en esta conversación.");
            return;
        }
        const senderAgentId = currentAgentInfo?.id || null; // Admin/Owner envían como 'agent' pero sin un agenteCrmId específico de la tabla Agente

        setIsSending(true); setError(null);
        const textToSend = newMessage.trim();

        // Usar el nuevo schema para el input
        const paramsForAction: EnviarMensajeParams = {
            conversacionId: currentConversationId,
            mensaje: textToSend,
            role: 'agent',
            agenteCrmId: senderAgentId,
        };

        setNewMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        const result = await enviarMensajeConversacionAction(paramsForAction); // Llamar a la nueva action
        setIsSending(false);

        if (result.success && result.data) {
            // Mensaje se añade vía Realtime, no es necesario añadirlo manualmente aquí
            // al menos que Realtime falle o quieras un update optimista más rápido.
            // setMessages(prev => [...prev, result.data!]); // Podría causar duplicados con Realtime
            console.log("Mensaje enviado, esperando Realtime o refresco manual si es necesario.");
        } else {
            setError(result.error || 'Error al enviar mensaje. Inténtalo de nuevo.');
            setNewMessage(textToSend); // Devolver el texto al input si falla
        }
    };

    // Función getMessageSenderIcon y otras helpers (sin cambios significativos, asegurar que usen ChatMessageItemData)
    const getMessageSenderIcon = (role: ChatMessageItemData['role'], agente?: AgenteBasicoData | null) => {
        let agentDisplayName: string | null = null;
        if (role === 'agent') {
            if (agente?.id === currentAgentInfo?.id) {
                agentDisplayName = currentAgentInfo?.nombre || user?.username || "Agente";
            } else if (agente) {
                agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`;
            } else if (isOwner || isAdmin) { // Mensaje de 'agent' sin agenteCrmId, enviado por owner/admin
                agentDisplayName = user?.username || (isAdmin ? "Admin" : "Propietario");
            } else {
                agentDisplayName = "Soporte"; // Fallback
            }
        }

        const displayName =
            role === 'user' ? (conversationDetails?.leadNombre || 'Usuario') :
                (role === 'assistant' ? 'Asistente IA' : agentDisplayName);

        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;
        if (role === 'agent' && isAdmin && (agente?.id === currentAgentInfo?.id || (!agente && !currentAgentInfo))) { // Admin que es el que envía o admin enviando sin ser agente
            return <span title={`${displayName} (Admin)`}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        }
        if (role === 'agent') return <span title={displayName || undefined}><User size={18} className="text-purple-300" /></span>; // User icon para agentes, pero con color diferente
        return null;
    };


    // ... (copiarIdConversacion, isSendDisabled, getMessageAlignment, getMessageBgColor sin cambios) ...
    const copiarIdConversacion = (id: string) => { navigator.clipboard.writeText(id); setMensajeCopiado('ID copiado'); setTimeout(() => { setMensajeCopiado(null); }, 2000); };
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);
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


    // JSX del componente (la estructura principal no cambia, solo los tipos de datos y llamadas a actions)
    return (
        <div className="flex flex-col h-full" style={{ maxHeight: 'calc(100vh - 120px)' }}> {/* Ajusta 120px a la altura de tus cabeceras */}
            {/* Cabecera del Chat */}
            <div className="p-3 md:p-4 border-b border-zinc-700 bg-zinc-800 flex-shrink-0 justify-between flex items-center">
                <h4 className="text-base md:text-lg font-semibold text-zinc-100 truncate pr-2" title={conversationDetails?.leadNombre || 'Chat'}>
                    Chat con {conversationDetails?.leadNombre || (isLoading && !conversationDetails ? 'Cargando...' : 'Contacto')}
                </h4>
                <div>
                    {mensajeCopiado && (<span className="text-xs text-zinc-300 mr-2">{mensajeCopiado}</span>)}
                    <span
                        className="text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded-md"
                        onClick={() => copiarIdConversacion(currentConversationId)}
                        title="Copiar ID Conversación"
                    >
                        ID: {currentConversationId.substring(0, 8)}...
                    </span>
                </div>
            </div>

            {/* Área de Mensajes */}
            <div className="flex-1 min-h-0 p-3 md:p-4 space-y-3 overflow-y-auto bg-zinc-900">
                {(isLoading || (isLoadingPermissions && messages.length === 0)) && ( // Mostrar si está cargando Y (permisos o no hay mensajes)
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 size={32} className="animate-spin text-zinc-400" />
                        <p className="text-zinc-500 mt-2">Cargando mensajes...</p>
                    </div>
                )}
                {!isLoading && !isLoadingPermissions && error && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <MessageSquareWarning size={32} className="mb-2" />
                        <p className="font-medium">Error:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                {/* Renderizado de mensajes (la lógica interna de mapeo y clases puede ser la misma) */}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'items-center' : ''}`}>
                        {msg.role !== 'system' ? (
                            <div className={`flex items-end gap-2 max-w-[80%] sm:max-w-[70%] md:max-w-[65%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {(msg.role === 'assistant' || msg.role === 'agent') && (
                                    <div className={`flex-shrink-0 self-end p-1.5 rounded-full w-7 h-7 flex items-center justify-center ${msg.role === 'agent' ? (msg.agenteCrm?.id === currentAgentInfo?.id && isAdmin && !isOwner ? 'bg-emerald-700' : 'bg-purple-700') : 'bg-zinc-700'}`}>
                                        {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                                    </div>
                                )}
                                <div className={`p-2.5 md:p-3 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                    {(msg.role === 'assistant' || msg.role === 'agent') && (
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                            <span className={`${msg.role === 'agent' ? (msg.agenteCrm?.id === currentAgentInfo?.id && isAdmin && !isOwner ? 'text-emerald-300' : 'text-purple-300') : 'text-zinc-400'}`}>
                                                {msg.role === 'agent'
                                                    ? (msg.agenteCrm?.nombre || (isOwner || isAdmin ? user?.username : 'Agente'))
                                                    : 'Asistente IA'
                                                }
                                            </span>
                                        </div>
                                    )}
                                    {msg.mensaje && <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>}
                                    {/* TODO: Renderizar mediaUrl si existe */}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex-shrink-0 self-end text-blue-300 p-1.5 bg-blue-800 rounded-full w-7 h-7 flex items-center justify-center">
                                        {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`${getMessageBgColor(msg.role)} px-3 py-1 text-xs rounded-full`}> {/* Estilo para mensajes de sistema */}
                                {msg.mensaje}
                            </div>
                        )}
                        <span className={`text-[0.7rem] text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : (msg.role === 'system' ? 'self-center' : 'self-start')}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Formulario de Envío */}
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-zinc-700 bg-zinc-800 flex-shrink-0">
                {/* Mostrar error específico del envío si existe y no se está enviando */}
                {!isSending && error && error.startsWith("No tienes permiso") && <p className="text-xs text-amber-400 mb-2">{error}</p>}
                {!isSending && error && !error.startsWith("No tienes permiso") && <p className="text-xs text-red-400 mb-2">{error}</p>}

                <div className="flex items-center gap-2 md:gap-3">
                    {/* ... (botón de adjuntar y file input sin cambios) ... */}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Adjuntar archivo" disabled={isSendDisabled}><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={() => {/* TODO */ }} disabled={isSendDisabled} />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isSendDisabled && !isLoadingPermissions ? "No puedes enviar mensajes" : "Escribe un mensaje..."}
                        className="flex-grow px-3 py-2.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 disabled:cursor-not-allowed"
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
                {/* Mensaje de permisos */}
                {isLoadingPermissions && <p className="text-xs text-zinc-400 mt-1.5 text-center">Verificando permisos...</p>}
                {!isLoadingPermissions && !canSendPermission && user !== null && (
                    <p className="text-xs text-amber-500 bg-amber-900/30 border border-amber-700/50 p-1.5 rounded mt-2 text-center">
                        No tienes permiso para enviar mensajes en este chat.
                    </p>
                )}
            </form>
        </div>
    );
}