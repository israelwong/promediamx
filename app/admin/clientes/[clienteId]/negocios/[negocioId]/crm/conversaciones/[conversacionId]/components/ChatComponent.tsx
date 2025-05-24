// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Send, Paperclip, Loader2, User, Bot, MessageSquareWarning, ShieldCheck } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import {
    enviarMensajeCrmAction,
} from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type {
    ChatMessageItemCrmData,
    EnviarMensajeCrmParams,
    ConversationDetailsForPanelData,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { chatMessageItemCrmSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';

import type { UsuarioExtendido } from '@/app/admin/_lib/types';
import { verifyToken } from '@/app/lib/auth';
const token = Cookies.get('token');

interface InteraccionRealtimePayload {
    id: string;
    conversacionId: string;
    role: string;
    mensajeTexto: string | null;
    parteTipo?: 'TEXT' | 'FUNCTION_CALL' | 'FUNCTION_RESPONSE' | null;
    functionCallNombre?: string | null;
    functionCallArgs?: unknown | null;
    functionResponseData?: unknown | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: string;
    agenteCrmId?: string | null;
    agenteCrm?: { id: string; nombre: string | null; } | null;
}

interface ChatComponentProps {
    initialConversationDetails: ConversationDetailsForPanelData;
    initialMessages: ChatMessageItemCrmData[];
    initialError?: string | null;
    negocioId: string;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
    else console.warn("[ChatComponent CRM] Supabase URL o Anon Key no definidas.");
}

export default function ChatComponent({
    initialConversationDetails,
    initialMessages,
    initialError,
    negocioId,
}: ChatComponentProps) {

    console.log('[ChatComponent Mount/Props] initialMessages:', JSON.stringify(initialMessages?.slice(0, 2), null, 2));
    console.log('[ChatComponent Mount/Props] initialError:', initialError);
    console.log('[ChatComponent Mount/Props] initialConversationDetails:', initialConversationDetails);

    const [messages, setMessages] = useState<ChatMessageItemCrmData[]>(initialMessages || []);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(initialConversationDetails);
    const [error, setError] = useState<string | null>(initialError || null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const fileInputRef = useRef<null | HTMLInputElement>(null);
    const router = useRouter();
    const params = useParams();

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [currentAgentInfo, setCurrentAgentInfo] = useState<AgenteBasicoCrmData | null>(null);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const currentConversationId = initialConversationDetails?.id;

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

    const ADMIN_ROLE_NAME = 'Administrador';

    useEffect(() => {

        console.log('[ChatComponent Effect] Sincronizando estado con props:');
        console.log('[ChatComponent Effect] initialMessages:', JSON.stringify(initialMessages?.slice(0, 2), null, 2));

        setConversationDetails(initialConversationDetails);
        setMessages(initialMessages || []);
        setError(initialError || null);
    }, [initialConversationDetails, initialMessages, initialError]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            const triggerLink = targetElement.closest('a.chat-image-lightbox-trigger') as HTMLAnchorElement | null;
            if (triggerLink) {
                event.preventDefault();
                const messageHtmlContentContainer = triggerLink.closest('.prose');
                if (messageHtmlContentContainer) {
                    const allImageLinksInMessage = Array.from(messageHtmlContentContainer.querySelectorAll<HTMLAnchorElement>('a.chat-image-lightbox-trigger'));
                    const slides = allImageLinksInMessage.map(link => ({ src: link.href, alt: link.dataset.alt || "Imagen" }));
                    const clickedImageIndex = allImageLinksInMessage.findIndex(link => link.href === triggerLink.href);
                    if (slides.length > 0) {
                        setLightboxSlides(slides);
                        setLightboxIndex(clickedImageIndex >= 0 ? clickedImageIndex : 0);
                        setLightboxOpen(true);
                    }
                } else {
                    setLightboxSlides([{ src: triggerLink.href, alt: triggerLink.dataset.alt || "Imagen" }]);
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                }
            }
        };
        container.addEventListener('click', handleClick);
        return () => { if (container) container.removeEventListener('click', handleClick); };
    }, [messages]);

    useEffect(() => {
        async function validarToken(tokenAuth: string | undefined) {
            if (tokenAuth) {
                try {
                    const response = await verifyToken(tokenAuth);
                    if (response.payload && 'id' in response.payload) {
                        const payload = response.payload as Record<string, unknown>;
                        const userData: UsuarioExtendido = {
                            id: payload.id as string,
                            username: payload.username as string,
                            email: payload.email as string,
                            rolNombre: typeof payload.rol === 'string' ? payload.rol : null,
                            token: tokenAuth,
                            status: (payload.status as string | null) ?? '',
                            createdAt: payload.createdAt ? new Date(payload.createdAt as string) : new Date(),
                            rolId: (payload.rolId as string | null) ?? null,
                            updatedAt: payload.updatedAt ? new Date(payload.updatedAt as string) : new Date(),
                            telefono: (payload.telefono as string | null) ?? '',
                        };
                        setUser(userData);
                    } else { Cookies.remove('token'); router.push('/login'); }
                } catch { Cookies.remove('token'); router.push('/login'); }
            } else { router.push('/login'); }
        }
        validarToken(token);
    }, [router]);

    useEffect(() => {
        const clienteIdFromRoute = params?.clienteId as string | undefined;
        async function checkPermissions() {
            if (user?.id && negocioId && clienteIdFromRoute) {
                setIsLoadingPermissions(true);
                let canSendMessages = false;

                if (user.rolNombre === ADMIN_ROLE_NAME) { setIsAdmin(true); canSendMessages = true; }
                if (user.id === clienteIdFromRoute) { setIsOwner(true); canSendMessages = true; }

                const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);
                if (result.success && result.data) {
                    setCurrentAgentInfo(result.data);
                    canSendMessages = true;
                } else if (!canSendMessages && result.error && !error) {
                    setError(result.error);
                }

                if (!canSendMessages && !error) {
                    setError("No tienes permiso para enviar mensajes en este chat.");
                } else if (canSendMessages && error === "No tienes permiso para enviar mensajes en este chat.") {
                    setError(null);
                }
                setIsLoadingPermissions(false);
            } else if (user !== null) {
                setIsLoadingPermissions(false);
                if (!error && !initialError) setError("No se pudo determinar la autorización (faltan datos de contexto).");
            }
        }
        if (user) {
            checkPermissions();
        } else if (user === null && Cookies.get('token')) {
            // Esperar
        } else if (!Cookies.get('token')) {
            setIsLoadingPermissions(false);
            if (!error && !initialError) setError("No autenticado.");
        }
    }, [user, negocioId, params?.clienteId, ADMIN_ROLE_NAME, error, initialError]);

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages, scrollToBottom]);

    useEffect(() => {
        if (!supabase || !currentConversationId) return;
        const channelName = `interacciones-conv-${currentConversationId}`;
        const channel: RealtimeChannel = supabase.channel(channelName)
            .on<InteraccionRealtimePayload>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Interaccion', filter: `conversacionId=eq.${currentConversationId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT' && payload.new) {
                        const nuevaInteraccionRt = payload.new;
                        console.log("[ChatComponent CRM Realtime] Nueva interacción recibida:", nuevaInteraccionRt);
                        setMessages(prevMessages => {
                            if (prevMessages.some(msg => msg.id === nuevaInteraccionRt.id)) return prevMessages;

                            const agenteDelPayload = nuevaInteraccionRt.agenteCrmId && nuevaInteraccionRt.agenteCrm
                                ? { id: nuevaInteraccionRt.agenteCrm.id, nombre: nuevaInteraccionRt.agenteCrm.nombre || null }
                                : null;

                            const nuevaChatMessage: Partial<ChatMessageItemCrmData> = {
                                id: nuevaInteraccionRt.id,
                                conversacionId: nuevaInteraccionRt.conversacionId,
                                role: nuevaInteraccionRt.role,
                                mensajeTexto: nuevaInteraccionRt.mensajeTexto ?? null,
                                parteTipo: nuevaInteraccionRt.parteTipo ?? 'TEXT',
                                functionCallNombre: nuevaInteraccionRt.functionCallNombre,
                                functionCallArgs: nuevaInteraccionRt.functionCallArgs as Record<string, unknown> | null | undefined,
                                functionResponseData: nuevaInteraccionRt.functionResponseData as Record<string, unknown> | null | undefined,
                                mediaUrl: nuevaInteraccionRt.mediaUrl ?? undefined,
                                mediaType: nuevaInteraccionRt.mediaType ?? undefined,
                                createdAt: new Date(nuevaInteraccionRt.createdAt),
                                agenteCrm: agenteDelPayload,
                            };

                            const validation = chatMessageItemCrmSchema.safeParse(nuevaChatMessage);
                            if (validation.success) {
                                return [...prevMessages, validation.data];
                            } else {
                                console.error("[ChatComponent CRM Realtime] Error Zod al parsear mensaje de Supabase:", validation.error.flatten().fieldErrors);
                                console.error("Payload que falló (Realtime):", nuevaChatMessage);
                                return prevMessages;
                            }
                        });
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[ChatComponent CRM Realtime] Suscrito a ${channelName}`);
                else if (err) console.error(`[ChatComponent CRM Realtime] Error canal ${channelName}:`, err);
                else console.log(`[ChatComponent CRM Realtime] Estado canal ${channelName}: ${status}`);
            });
        return () => { if (supabase && channel) { console.log(`[ChatComponent CRM Realtime] Desuscribiendo de ${channelName}`); supabase.removeChannel(channel).catch(console.error); } };
    }, [currentConversationId]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !fileInputRef.current?.files?.length) return;
        if (!currentConversationId) {
            setError("Error: No hay una conversación activa seleccionada.");
            return;
        }

        const canSend = currentAgentInfo?.id || isOwner || isAdmin;
        if (!canSend) {
            setError("No tienes permiso para enviar mensajes en esta conversación.");
            return;
        }

        const senderAgentId = currentAgentInfo?.id;

        setIsSending(true); setError(null);
        const textToSend = newMessage.trim();

        const paramsForAction: EnviarMensajeCrmParams = {
            conversacionId: currentConversationId,
            mensaje: textToSend,
            role: 'agent',
            agenteCrmId: senderAgentId as string,
        };

        if (paramsForAction.role === 'agent' && !paramsForAction.agenteCrmId && !isOwner && !isAdmin) {
            setError("No se pudo identificar al agente remitente para enviar el mensaje. Intenta recargar.");
            setIsSending(false);
            return;
        }

        setNewMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        const result = await enviarMensajeCrmAction(paramsForAction);
        setIsSending(false);

        if (result.success && result.data) {
            console.log("Mensaje enviado desde CRM, esperando Realtime.");
        } else {
            setError(result.error || 'Error al enviar mensaje desde CRM.');
            if (result.errorDetails) console.error("Errores de validación al enviar:", result.errorDetails);
            setNewMessage(textToSend);
        }
    };

    const getMessageSenderIcon = (role: ChatMessageItemCrmData['role'], agente?: AgenteBasicoCrmData | null) => {
        let agentDisplayName: string | null = null;
        if (role === 'agent') {
            if (agente?.id && currentAgentInfo?.id && agente.id === currentAgentInfo.id) {
                agentDisplayName = currentAgentInfo.nombre || user?.username || "Tú";
            } else if (agente) {
                agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`;
            } else if (isOwner || isAdmin) {
                agentDisplayName = user?.username || (isAdmin ? "Admin" : "Propietario");
            } else {
                agentDisplayName = "Soporte";
            }
        }
        const displayName =
            role === 'user' ? (conversationDetails?.leadNombre || 'Cliente') :
                (role === 'assistant' ? 'Asistente IA' : agentDisplayName);

        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;

        if (role === 'agent' && (isOwner || isAdmin) && (!agente || agente?.userId === user?.id)) {
            return <span title={`${user?.username} (${isAdmin ? "Admin" : "Propietario"})`}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        }
        if (role === 'agent') return <span title={displayName || undefined}><User size={18} className="text-purple-300" /></span>;
        return null;
    };

    const copiarIdConversacion = (id: string | undefined) => {
        if (id) {
            navigator.clipboard.writeText(id);
            setMensajeCopiado('ID copiado!');
            setTimeout(() => { setMensajeCopiado(null); }, 2000);
        }
    };

    const canSendPermission = currentAgentInfo?.id || isOwner || isAdmin;
    const isSendDisabled = isSending || isLoadingPermissions || !canSendPermission || !currentConversationId;

    function getMessageAlignment(role: string) {
        switch (role) {
            case 'user': return 'items-end';
            case 'assistant': case 'agent': return 'items-start';
            case 'system': return 'items-center';
            default: return 'items-start';
        }
    }
    function getMessageBgColor(role: string) {
        switch (role) {
            case 'user': return 'bg-blue-800 text-blue-100';
            case 'assistant': return 'bg-zinc-700 text-zinc-100';
            case 'agent': return 'bg-purple-700 text-purple-100';
            case 'system': return 'bg-zinc-600 text-zinc-200';
            default: return 'bg-zinc-800 text-zinc-100';
        }
    }

    // --- LÓGICA DE RENDERIZADO PRINCIPAL ---
    // Primero, verificar si los detalles de la conversación (esenciales) no están y hay un error.
    if (!initialConversationDetails && initialError) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-red-400" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <MessageSquareWarning size={32} className="mb-2" />
                <p className="font-medium">Error al cargar detalles de la conversación:</p>
                <p className="text-sm">{initialError}</p>
            </div>
        );
    }
    // Si no hay detalles pero tampoco error inicial, podría ser que la página padre aún no los carga.
    // O si initialConversationDetails es null después de la carga.
    if (!conversationDetails) { // Usar el estado conversationDetails que se sincroniza con initialConversationDetails
        return (
            <div className="flex flex-col items-center justify-center h-full p-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <Loader2 size={32} className="animate-spin text-zinc-400" />
                <p className="text-zinc-500 mt-2">Cargando conversación...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-800" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div className="p-3 md:p-4 border-b border-zinc-700 bg-zinc-800 flex-shrink-0 justify-between flex items-center">
                <h4 className="text-base md:text-lg font-semibold text-zinc-100 truncate pr-2" title={conversationDetails?.leadNombre || 'Chat'}>
                    Chat con {conversationDetails?.leadNombre || 'Contacto'}
                </h4>
                <div>
                    {mensajeCopiado && (<span className="text-xs text-green-400 mr-2">{mensajeCopiado}</span>)}
                    <span
                        className="text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer inline-flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded-md"
                        onClick={() => copiarIdConversacion(currentConversationId)}
                        title="Copiar ID Conversación"
                    >
                        ID: {currentConversationId?.substring(0, 8)}...
                    </span>
                </div>
            </div>

            <div ref={messagesContainerRef} className="flex-1 min-h-0 p-3 md:p-4 space-y-3 overflow-y-auto bg-zinc-900">
                {/* Caso 1: Hay un error (de carga de mensajes) y no hay mensajes para mostrar */}
                {error && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-red-400">
                        <MessageSquareWarning size={32} className="mb-2" />
                        <p className="font-medium">Error al cargar mensajes:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                {/* Caso 2: No hay error, los permisos están cargados, pero no hay mensajes */}
                {messages.length === 0 && !error && !isLoadingPermissions && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <MessageSquareWarning size={32} className="mb-2" />
                        <p>No hay mensajes en esta conversación.</p>
                    </div>
                )}
                {/* Caso 3: Permisos aún cargando y no hay mensajes (y no hay error de mensajes) */}
                {isLoadingPermissions && messages.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                        <Loader2 size={32} className="animate-spin text-zinc-400" />
                        <p className="mt-2">Cargando permisos y mensajes...</p>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'items-center' : ''}`}>
                        {msg.role !== 'system' ? (
                            <div className={`flex items-end gap-2 max-w-[80%] sm:max-w-[70%] md:max-w-[65%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {(msg.role === 'assistant' || msg.role === 'agent') && (
                                    <div className={`flex-shrink-0 self-end p-1.5 rounded-full w-7 h-7 flex items-center justify-center ${msg.role === 'agent' ? (msg.agenteCrm?.id === currentAgentInfo?.id && (isAdmin || isOwner) ? 'bg-emerald-700' : 'bg-purple-700') : 'bg-zinc-700'}`}>
                                        {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                                    </div>
                                )}
                                <div className={`p-2.5 md:p-3 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                    {(msg.role === 'agent' && msg.agenteCrm?.nombre && !(currentAgentInfo?.id === msg.agenteCrm.id && (isOwner || isAdmin))) && (
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                            <span className='text-purple-300'>
                                                {msg.agenteCrm.nombre}
                                            </span>
                                        </div>
                                    )}
                                    {(msg.role === 'assistant') && (
                                        <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                            <span className='text-zinc-400'>
                                                Asistente IA
                                            </span>
                                        </div>
                                    )}
                                    {msg.mensajeTexto && (
                                        (msg.role === 'assistant' && (msg.parteTipo === 'FUNCTION_CALL' || msg.parteTipo === 'FUNCTION_RESPONSE' || (msg.mensajeTexto && msg.mensajeTexto.includes('<')))) ?
                                            (<div className="text-sm prose prose-sm prose-invert max-w-none chat-message-content" dangerouslySetInnerHTML={{ __html: msg.mensajeTexto }} />) :
                                            (<p className="text-sm whitespace-pre-wrap chat-message-content">{msg.mensajeTexto}</p>)
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="flex-shrink-0 self-end text-blue-300 p-1.5 bg-blue-800 rounded-full w-7 h-7 flex items-center justify-center">
                                        {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`${getMessageBgColor(msg.role)} px-3 py-1 text-xs rounded-full`}>
                                {msg.mensajeTexto}
                            </div>
                        )}
                        <span className={`text-[0.7rem] text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : (msg.role === 'system' ? 'self-center' : 'self-start')}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-zinc-700 bg-zinc-800 flex-shrink-0">
                {!isSending && error && <p className={`text-xs mb-2 ${error.startsWith("No tienes permiso") ? 'text-amber-400' : 'text-red-400'}`}>{error}</p>}
                <div className="flex items-center gap-2 md:gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Adjuntar archivo" disabled={isSendDisabled}><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={() => { /* TODO */ }} disabled={isSendDisabled} />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isSendDisabled && !isLoadingPermissions ? "No puedes enviar mensajes" : "Escribe un mensaje como agente..."}
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
                {isLoadingPermissions && <p className="text-xs text-zinc-400 mt-1.5 text-center">Verificando permisos...</p>}
                {!isLoadingPermissions && !canSendPermission && user !== null && (
                    <p className="text-xs text-amber-500 bg-amber-900/30 border border-amber-700/50 p-1.5 rounded mt-2 text-center">
                        No tienes permiso para enviar mensajes en este chat.
                    </p>
                )}
            </form>
            {lightboxOpen && (<Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxIndex} />)}
        </div>
    );
}
