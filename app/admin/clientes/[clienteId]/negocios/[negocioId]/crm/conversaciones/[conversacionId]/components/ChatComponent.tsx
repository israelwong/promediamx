// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { Send, Paperclip, Loader2, User, Bot, MessageSquareWarning, ShieldCheck, Image as ImageIcon } from 'lucide-react';
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
    // AgenteBasicoData, // Se usará AgenteBasicoCrmData
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { chatMessageItemCrmSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';

import { type UsuarioExtendido, UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';
import { verifyToken } from '@/app/lib/auth';

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
    initialConversationDetails: ConversationDetailsForPanelData | null;
    initialMessages: ChatMessageItemCrmData[];
    initialError?: string | null;
    negocioId: string;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[ChatComponent CRM] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
    }
}

const ClientTime = ({ date }: { date: Date | string }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) {
        try {
            return <>{new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</>;
        } catch { return <>--:--</>; }
    }
    return <>{new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}</>;
};

export default function ChatComponent({
    initialConversationDetails,
    initialMessages,
    initialError,
    negocioId,
}: ChatComponentProps) {

    console.log(initialConversationDetails, initialMessages, initialError);

    // useEffect(() => {
    // console.log("[ChatComponent MOUNT/PROPS UPDATE] Props recibidas:", { 
    //     detailsId: initialConversationDetails?.id, 
    //     messagesCount: initialMessages?.length,
    //     error: initialError 
    // });
    // }, [initialConversationDetails, initialMessages, initialError]);

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
    const currentConversationId = conversationDetails?.id;

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

    const ADMIN_ROLE_NAME = 'Administrador'; // O importarlo de constantes

    useEffect(() => {
        setConversationDetails(initialConversationDetails);
        setMessages(initialMessages || []);
        setError(initialError || null);

        if (initialConversationDetails?.id !== conversationDetails?.id) {
            setIsLoadingPermissions(true);
            setCurrentAgentInfo(null);
            // Limpiar errores de permisos anteriores si la conversación cambia
            if (error === "No tienes permiso para enviar mensajes en este chat." ||
                error === "No se pudo determinar la autorización (faltan datos de contexto para permisos)." ||
                error === "No autenticado para esta conversación.") {
                setError(null);
            }
        }
    }, [initialConversationDetails, initialMessages, initialError, conversationDetails?.id, error]);


    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            const triggerLink = targetElement.closest('a.chat-image-lightbox-trigger') as HTMLAnchorElement | null;
            if (triggerLink && conversationDetails?.canalOrigen === 'webchat') {
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
    }, [messages, conversationDetails?.canalOrigen]);

    useEffect(() => {
        async function validarToken() {
            const currentToken = Cookies.get('token');
            if (currentToken) {
                try {
                    const response = await verifyToken(currentToken);
                    const parsedPayload = UserTokenPayloadSchema.safeParse(response.payload);

                    if (parsedPayload.success) {
                        const tokenData = parsedPayload.data;
                        // Construir UsuarioExtendido con los campos del token y los demás como opcionales/undefined
                        const userData: UsuarioExtendido = {
                            id: tokenData.id,
                            username: tokenData.username,
                            email: tokenData.email,
                            rolNombre: tokenData.rol,
                            token: currentToken,
                            // Los demás campos de UsuarioExtendido son opcionales según su schema Zod
                        };
                        setUser(userData);
                    } else {
                        console.error("Error parseando payload del token con Zod:", parsedPayload.error);
                        Cookies.remove('token');
                        router.push('/login');
                    }
                } catch (e) {
                    console.error("Error en verifyToken:", e);
                    Cookies.remove('token');
                    router.push('/login');
                }
            } else {
                console.log("[ChatComponent] No hay token, redirigiendo a login.");
                router.push('/login');
            }
        }
        validarToken();
    }, [router]);

    useEffect(() => {
        const clienteIdFromRoute = params?.clienteId as string | undefined;
        async function checkPermissions() {
            if (user?.id && negocioId && clienteIdFromRoute && currentConversationId) {
                setIsLoadingPermissions(true); // Indicar que estamos cargando permisos
                let currentErrorState = error;
                if (currentErrorState === "No tienes permiso para enviar mensajes en este chat." ||
                    currentErrorState === "No se pudo determinar la autorización (faltan datos de contexto para permisos)." ||
                    currentErrorState === "No autenticado para esta conversación.") {
                    currentErrorState = null;
                }

                let canSendPerm = false;
                if (user.rolNombre === ADMIN_ROLE_NAME) { setIsAdmin(true); canSendPerm = true; }
                if (user.id === clienteIdFromRoute) { setIsOwner(true); canSendPerm = true; }

                const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);
                if (result.success && result.data) {
                    setCurrentAgentInfo(result.data); // result.data es AgenteBasicoCrmData
                    canSendPerm = true;
                } else if (!canSendPerm && result.error && !currentErrorState && !initialError) {
                    currentErrorState = result.error;
                }

                if (!canSendPerm && !currentErrorState && !initialError) {
                    currentErrorState = "No tienes permiso para enviar mensajes en este chat.";
                }
                setError(currentErrorState); // Actualizar error solo si es relevante para permisos
                setIsLoadingPermissions(false);
            } else if (user !== null && currentConversationId) { // User cargado, hay conversación, pero faltan IDs de ruta
                setIsLoadingPermissions(false);
                if (!error && !initialError) setError("No se pudo determinar la autorización (faltan datos de contexto para permisos).");
            } else if (!currentConversationId && user) { // Hay usuario pero no conversación (ej. página base del CRM)
                setIsLoadingPermissions(false); // No hay permisos específicos de conversación que cargar
            } else if (!user && !Cookies.get('token') && currentConversationId) { // No hay usuario, no hay token, pero sí conversación
                setIsLoadingPermissions(false);
                if (!error && !initialError) setError("No autenticado para esta conversación.");
            } else { // Otros casos (ej. user es null pero hay token, se está validando)
                if (!Cookies.get('token') && !user) { // Si no hay token y no hay usuario, marcar permisos como no cargando
                    setIsLoadingPermissions(false);
                }
            }
        }
        // Solo ejecutar checkPermissions si user está definido Y currentConversationId está definido
        // Y si isLoadingPermissions es true (para evitar re-ejecuciones innecesarias)
        if (user && currentConversationId && isLoadingPermissions) {
            checkPermissions();
        } else if (!currentConversationId && user) { // Si hay usuario pero no conversación, no hay permisos que cargar
            setIsLoadingPermissions(false);
        }

    }, [user, negocioId, params?.clienteId, ADMIN_ROLE_NAME, error, initialError, currentConversationId, isLoadingPermissions]);

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
                        setMessages(prevMessages => {
                            if (prevMessages.some(msg => msg.id === nuevaInteraccionRt.id)) return prevMessages;
                            const agenteDelPayload = nuevaInteraccionRt.agenteCrmId && nuevaInteraccionRt.agenteCrm
                                ? { id: nuevaInteraccionRt.agenteCrm.id, nombre: nuevaInteraccionRt.agenteCrm.nombre || null }
                                : null;
                            let parsedArgsRt: Record<string, unknown> | null | undefined = undefined;
                            if (nuevaInteraccionRt.functionCallArgs && typeof nuevaInteraccionRt.functionCallArgs === 'string') {
                                try {
                                    const parsed = JSON.parse(nuevaInteraccionRt.functionCallArgs);
                                    parsedArgsRt = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as Record<string, unknown> : { error: "parse_failed" };
                                } catch {
                                    parsedArgsRt = { error: "parse_failed" };
                                }
                            } else if (nuevaInteraccionRt.functionCallArgs && typeof nuevaInteraccionRt.functionCallArgs === 'object' && !Array.isArray(nuevaInteraccionRt.functionCallArgs)) {
                                parsedArgsRt = nuevaInteraccionRt.functionCallArgs as Record<string, unknown>;
                            } else if (nuevaInteraccionRt.functionCallArgs == null) {
                                parsedArgsRt = null;
                            }
                            let parsedResponseDataRt: Record<string, unknown> | null | undefined = undefined;
                            if (nuevaInteraccionRt.functionResponseData && typeof nuevaInteraccionRt.functionResponseData === 'string') {
                                try {
                                    const parsed = JSON.parse(nuevaInteraccionRt.functionResponseData);
                                    parsedResponseDataRt = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed as Record<string, unknown> : { error: "parse_failed" };
                                } catch {
                                    parsedResponseDataRt = { error: "parse_failed" };
                                }
                            } else if (nuevaInteraccionRt.functionResponseData && typeof nuevaInteraccionRt.functionResponseData === 'object' && !Array.isArray(nuevaInteraccionRt.functionResponseData)) {
                                parsedResponseDataRt = nuevaInteraccionRt.functionResponseData as Record<string, unknown>;
                            } else if (nuevaInteraccionRt.functionResponseData == null) {
                                parsedResponseDataRt = null;
                            }
                            const nuevaChatMessage: Partial<ChatMessageItemCrmData> = {
                                id: nuevaInteraccionRt.id,
                                conversacionId: nuevaInteraccionRt.conversacionId,
                                role: nuevaInteraccionRt.role,
                                mensajeTexto: nuevaInteraccionRt.mensajeTexto ?? null,
                                parteTipo: nuevaInteraccionRt.parteTipo ?? 'TEXT',
                                functionCallNombre: nuevaInteraccionRt.functionCallNombre,
                                functionCallArgs: parsedArgsRt,
                                functionResponseData: parsedResponseDataRt,
                                mediaUrl: nuevaInteraccionRt.mediaUrl ?? undefined,
                                mediaType: nuevaInteraccionRt.mediaType ?? undefined,
                                createdAt: new Date(nuevaInteraccionRt.createdAt),
                                agenteCrm: agenteDelPayload,
                            };
                            const validation = chatMessageItemCrmSchema.safeParse(nuevaChatMessage);
                            if (validation.success) return [...prevMessages, validation.data];
                            else { console.error("[CRM Realtime] Error Zod:", validation.error.flatten().fieldErrors, "Payload:", nuevaChatMessage); return prevMessages; }
                        });
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[CRM Realtime] Suscrito a ${channelName}`);
                else if (err) console.error(`[CRM Realtime] Error canal ${channelName}:`, err);
            });
        return () => { if (supabase && channel) { supabase.removeChannel(channel).catch(console.error); } };
    }, [currentConversationId]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !fileInputRef.current?.files?.length) return;
        if (!currentConversationId) { setError("Error: No hay una conversación activa."); return; }

        const canSend = currentAgentInfo?.id || isOwner || isAdmin; // Usar los estados de permiso reales
        if (!canSend) { setError("No tienes permiso para enviar mensajes."); return; }

        const senderAgentId = currentAgentInfo?.id;

        setIsSending(true); setError(null);
        const textToSend = newMessage.trim();
        const paramsForAction: EnviarMensajeCrmParams = {
            conversacionId: currentConversationId,
            mensaje: textToSend,
            role: 'agent',
            agenteCrmId: senderAgentId || null,
        };

        if (paramsForAction.role === 'agent' && !paramsForAction.agenteCrmId && !isOwner && !isAdmin) {
            setError("No se pudo identificar al agente remitente. Por favor, recarga la página.");
            setIsSending(false);
            return;
        }

        setNewMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        const result = await enviarMensajeCrmAction(paramsForAction);
        setIsSending(false);
        if (!result.success) {
            setError(result.error || 'Error al enviar mensaje.');
            if (result.errorDetails) console.error("Errores de validación:", result.errorDetails);
            setNewMessage(textToSend);
        }
    };

    const getMessageSenderIcon = (role: ChatMessageItemCrmData['role'], agente?: AgenteBasicoCrmData | null) => {
        let agentDisplayName: string | null = null;
        const localUser = user;
        const localCurrentAgentInfo = currentAgentInfo;

        if (role === 'agent') {
            if (agente?.id && localCurrentAgentInfo?.id && agente.id === localCurrentAgentInfo.id) {
                agentDisplayName = localCurrentAgentInfo.nombre || localUser?.username || "Tú";
            } else if (agente) {
                agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`;
            } else if (isOwner || isAdmin) {
                agentDisplayName = localUser?.username || (isAdmin ? "Admin" : "Propietario");
            } else {
                agentDisplayName = "Soporte";
            }
        }
        const displayName =
            role === 'user' ? (conversationDetails?.leadNombre || 'Cliente') :
                (role === 'assistant' ? 'Asistente IA' : agentDisplayName);

        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;
        if (role === 'agent' && (isOwner || isAdmin) && (!agente || agente?.userId === localUser?.id)) {
            return <span title={`${localUser?.username} (${isAdmin ? "Admin" : "Propietario"})`}><ShieldCheck size={18} className="text-emerald-400" /></span>;
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

    const canSendPermission = !!(currentAgentInfo?.id || isOwner || isAdmin);
    const isSendDisabledFinal = isSending || isLoadingPermissions || !canSendPermission || !currentConversationId;

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

    if (!conversationDetails) {
        let message = "Cargando datos de la conversación...";
        let icon = <Loader2 size={32} className="animate-spin text-zinc-400" />;
        let textColor = "text-zinc-500";
        if (error) {
            message = `Error al cargar la conversación: ${error}`;
            icon = <MessageSquareWarning size={32} className="mb-2 text-red-400" />;
            textColor = "text-red-400";
        }
        return (
            <div className="flex flex-col items-center justify-center h-full p-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                {icon}
                <p className={`mt-2 ${textColor}`}>{message}</p>
            </div>
        );
    }

    let chatAreaContent;
    if (isLoadingPermissions && messages.length === 0 && !error) {
        chatAreaContent = (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Loader2 size={32} className="animate-spin text-zinc-400" />
                <p className="mt-2">Verificando permisos y cargando mensajes...</p>
            </div>
        );
    } else if (error && messages.length === 0 && !isLoadingPermissions) {
        chatAreaContent = (
            <div className="flex flex-col items-center justify-center h-full text-red-400">
                <MessageSquareWarning size={32} className="mb-2" />
                <p className="font-medium">Error:</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    } else if (messages.length === 0 && !error && !isLoadingPermissions) {
        chatAreaContent = (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <MessageSquareWarning size={32} className="mb-2" />
                <p>No hay mensajes en esta conversación.</p>
            </div>
        );
    } else if (messages.length > 0) {
        chatAreaContent = messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'items-center' : ''}`}>
                {msg.role !== 'system' ? (
                    <div className={`flex items-end gap-2 max-w-[80%] sm:max-w-[70%] md:max-w-[65%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        {(msg.role === 'assistant' || msg.role === 'agent') && (
                            <div className={`flex-shrink-0 self-end p-1.5 rounded-full w-7 h-7 flex items-center justify-center ${msg.role === 'agent' ? (msg.agenteCrm?.id === currentAgentInfo?.id && (isAdmin || isOwner) ? 'bg-emerald-700' : 'bg-purple-700') : 'bg-zinc-700'}`}>
                                {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                            </div>
                        )}
                        <div className={`p-2.5 md:p-3 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                            {(msg.role === 'agent' && msg.agenteCrm?.nombre && !(currentAgentInfo?.id === msg.agenteCrm.id && (isAdmin || isOwner))) && (
                                <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                    <span className='text-purple-300'>{msg.agenteCrm.nombre}</span>
                                </div>
                            )}
                            {(msg.role === 'assistant') && (
                                <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                    <span className='text-zinc-400'>Asistente IA</span>
                                </div>
                            )}
                            {msg.mensajeTexto ? (
                                (conversationDetails?.canalOrigen === 'webchat' && msg.mensajeTexto.includes('<a href') && msg.mensajeTexto.includes('chat-image-lightbox-trigger')) ||
                                    (msg.role === 'assistant' && (msg.parteTipo === 'FUNCTION_CALL' || msg.parteTipo === 'FUNCTION_RESPONSE')) ?
                                    (<div className="text-sm prose prose-sm prose-invert max-w-none chat-message-content" dangerouslySetInnerHTML={{ __html: msg.mensajeTexto }} />) :
                                    (<p className="text-sm whitespace-pre-wrap chat-message-content">{msg.mensajeTexto}</p>)
                            ) : (
                                <p className="text-sm italic text-zinc-500">[Mensaje sin contenido de texto]</p>
                            )}
                            {msg.mediaUrl && conversationDetails?.canalOrigen === 'whatsapp' && (
                                <div className="mt-2">
                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm flex items-center gap-1">
                                        <ImageIcon size={14} /> Ver Imagen/Adjunto
                                    </a>
                                </div>
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
                        {msg.mensajeTexto || '[Mensaje de sistema vacío]'}
                    </div>
                )}
                <span className={`text-[0.7rem] text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : (msg.role === 'system' ? 'self-center' : 'self-start')}`}>
                    <ClientTime date={msg.createdAt} />
                </span>
            </div>
        ));
    } else {
        chatAreaContent = <div className="flex-1 flex items-center justify-center text-zinc-500">Preparando chat...</div>;
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
                {chatAreaContent}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-zinc-700 bg-zinc-800 flex-shrink-0">
                {!isSending && error && !error.startsWith("No tienes permiso") && !error.startsWith("No se pudo determinar") && !error.startsWith("No autenticado") &&
                    <p className="text-xs mb-2 text-red-400">{error}</p>
                }
                <div className="flex items-center gap-2 md:gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500" aria-label="Adjuntar archivo" disabled={isSendDisabledFinal}><Paperclip size={20} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={() => { /* TODO */ }} disabled={isSendDisabledFinal} />
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={isSendDisabledFinal && isLoadingPermissions ? "Verificando permisos..." : (isSendDisabledFinal ? "No puedes enviar mensajes" : "Escribe un mensaje como agente...")}
                        className="flex-grow px-3 py-2.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 disabled:cursor-not-allowed"
                        disabled={isSendDisabledFinal}
                    />
                    <button
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={isSendDisabledFinal || (!newMessage.trim() && (!fileInputRef.current || !fileInputRef.current.files || fileInputRef.current.files.length === 0))}
                    >
                        {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        <span className="hidden sm:inline">Enviar</span>
                    </button>
                </div>
                {/* Mensaje de permisos restaurado */}
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
