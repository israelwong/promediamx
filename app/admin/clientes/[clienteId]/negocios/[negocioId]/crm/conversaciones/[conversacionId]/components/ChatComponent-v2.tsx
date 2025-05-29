// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback, memo, JSX } from 'react';
import {
    createClient, SupabaseClient, RealtimeChannel
} from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, MessageSquareWarning, User, Bot, ShieldCheck } from 'lucide-react';

// Lightbox
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

// Actions
import { enviarMensajeCrmAction } from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions';
import { verifyToken } from '@/app/lib/auth';

// Schemas y Tipos
import type {
    ChatMessageItemCrmData,
    ConversationDetailsForPanelData,
    // EnviarMensajeCrmParams,
    // MediaItem, // Usado en ChatMessageBubble
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import {
    chatMessageItemCrmSchema,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';
import { type UsuarioExtendido, UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';
import { InteraccionParteTipo } from '@prisma/client';

// Subcomponentes
import ChatHeader from './ChatHeader';
import ChatInputArea from './ChatInputArea';
import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble';

interface InteraccionRealtimePayload {
    id: string; conversacionId: string; role: string; mensajeTexto: string | null;
    parteTipo?: 'TEXT' | 'FUNCTION_CALL' | 'FUNCTION_RESPONSE' | null;
    functionCallNombre?: string | null; functionCallArgs?: unknown | null;
    functionResponseData?: unknown | null; uiComponentPayload?: unknown | null;
    mediaUrl?: string | null; mediaType?: string | null;
    createdAt: string; agenteCrmId?: string | null;
    agenteCrm?: { id: string; nombre: string | null; userId?: string | null };
    canalInteraccion?: string | null;
}

interface ChatComponentProps {
    // Esta prop DEBE ser actualizada en tiempo real por el componente padre (ConversacionDetalle.tsx)
    conversationDetails: ConversationDetailsForPanelData | null;
    initialMessages: ChatMessageItemCrmData[];
    // Este error es para la carga inicial de mensajes o si la carga de detalles falló en el padre
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
        console.warn("[ChatComponent CRM UltraFinal V2] Supabase URL o Anon Key no definidas.");
    }
}

const ADMIN_ROLE_NAME = 'Administrador';

const ClientTime = memo(({ date }: { date: Date | string | undefined | null }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!date) return <>--:--</>;
    let displayDate: Date;
    try {
        displayDate = new Date(date);
        if (isNaN(displayDate.getTime())) return <>--:--</>;
    } catch { return <>--:--</>; }
    if (!mounted) return <>{displayDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</>;
    return <>{displayDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}</>;
});
ClientTime.displayName = 'ClientTime';

export default function ChatComponent({
    conversationDetails, // Esta prop se asume actualizada en tiempo real por ConversacionDetalle.tsx
    initialMessages,
    initialError,
    negocioId,
}: ChatComponentProps) {

    const [messages, setMessages] = useState<ChatMessageItemCrmData[]>(initialMessages || []);
    // Estado para errores que se muestran en la UI, priorizando el de permisos.
    const [displayError, setDisplayError] = useState<string | null>(initialError || null);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const params = useParams();

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [currentAgentInfo, setCurrentAgentInfo] = useState<AgenteBasicoCrmData | null>(null); // Info del agente si el user es agente
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

    // Estados para los roles específicos del usuario actual
    const [isUserAdmin, setIsUserAdmin] = useState(false);
    const [isUserOwner, setIsUserOwner] = useState(false);
    const [isUserCrmAgent, setIsUserCrmAgent] = useState(false); // Si el usuario es un agente CRM para este negocio

    const currentConversationId = conversationDetails?.id;

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string; type?: "image" }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

    // EFECTO: Sincronizar mensajes y error general si las props iniciales cambian
    useEffect(() => {
        setMessages(initialMessages || []);
        // Solo actualizar displayError con initialError si no hay ya un error de permiso
        if (!displayError?.includes("permiso")) {
            setDisplayError(initialError || null);
        }
    }, [initialMessages, initialError, displayError]); // Agregado displayError a dependencias para cumplir con reglas de React

    // EFECTO: Validar token de usuario
    useEffect(() => {
        async function validarToken() {
            const currentToken = Cookies.get('token');
            if (currentToken) {
                try {
                    const response = await verifyToken(currentToken);
                    const parsedPayload = UserTokenPayloadSchema.safeParse(response.payload);
                    if (parsedPayload.success) {
                        setUser(parsedPayload.data);
                    } else { Cookies.remove('token'); router.push('/login'); }
                } catch { Cookies.remove('token'); router.push('/login'); }
            } else { router.push('/login'); }
        }
        validarToken();
    }, [router]);

    // FUNCIÓN PARA ABRIR LIGHTBOX
    const openLightboxWithSlides = useCallback((slides: { src: string; alt?: string; type?: "image" }[], index: number) => {
        // console.log(`[ChatComponent UltraFinal V2 - openLightbox] Caller: ${caller || 'N/A'}, Slides: ${slides.length}, Index: ${index}`);
        const imageSlidesOnly = slides.filter(slide => slide.type === 'image' && slide.src);
        if (imageSlidesOnly.length > 0) {
            setLightboxSlides(imageSlidesOnly);
            const validIndex = index >= 0 && index < imageSlidesOnly.length ? index : 0;
            setLightboxIndex(validIndex);
            setLightboxOpen(true);
        }
    }, []);

    // EFECTO: Lightbox para contenido HTML (webchat)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || messages.length === 0 || conversationDetails?.canalOrigen !== 'webchat') {
            // console.log("[ChatComponent V5 - Lightbox HTML Effect] No se adjunta listener. Container:", !!container, "Canal:", conversationDetails?.canalOrigen);
            return;
        }

        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            const triggerAnchor = targetElement.closest('a.chat-image-lightbox-trigger') as HTMLAnchorElement | null;

            if (triggerAnchor && triggerAnchor.href) {
                event.preventDefault();
                const messageHtmlContentContainer = triggerAnchor.closest('.chat-message-content.prose');
                let slides: { src: string; alt?: string; type?: "image" }[] = [];
                let clickedImageIndex = -1;

                if (messageHtmlContentContainer) {
                    const allImageAnchorsInMessage = Array.from(messageHtmlContentContainer.querySelectorAll<HTMLAnchorElement>('a.chat-image-lightbox-trigger'));
                    slides = allImageAnchorsInMessage.filter(link => link.href).map(link => ({ src: link.href, alt: link.querySelector('img')?.alt || link.dataset.alt || "Imagen Webchat", type: 'image' as const }));
                    clickedImageIndex = slides.findIndex(slide => slide.src === triggerAnchor!.href);
                } else { slides = [{ src: triggerAnchor.href, alt: triggerAnchor.querySelector('img')?.alt || triggerAnchor.dataset.alt || "Imagen Webchat", type: 'image' as const }]; clickedImageIndex = 0; }

                if (slides.length > 0) {
                    openLightboxWithSlides(slides, clickedImageIndex >= 0 ? clickedImageIndex : 0);
                }
            }
        };
        // console.log("[ChatComponent V5] Adjuntando listener de click para Lightbox HTML.");
        container.addEventListener('click', handleClick);
        return () => { if (container) { /* console.log("[ChatComponent V5] Removiendo listener de click Lightbox HTML."); */ container.removeEventListener('click', handleClick); } };
    }, [messages, conversationDetails?.canalOrigen, openLightboxWithSlides]);


    // EFECTO: Verificar permisos del usuario/agente
    useEffect(() => {
        const clienteIdFromRoute = params?.clienteId as string | undefined;
        const controller = new AbortController();

        async function checkPermissions() {
            // Resetear todos los estados de permiso al inicio de la verificación
            setIsUserAdmin(false);
            setIsUserOwner(false);
            setIsUserCrmAgent(false);
            setCurrentAgentInfo(null);
            // Limpiar error de permiso previo solo si no es un error de carga inicial más general
            if (displayError?.includes("permiso") && !initialError) {
                setDisplayError(null);
            }

            if (!user?.id || !negocioId || !clienteIdFromRoute || !currentConversationId) {
                setIsLoadingPermissions(false);
                return;
            }

            setIsLoadingPermissions(true);

            const isAdminRole = user.rolNombre === ADMIN_ROLE_NAME;
            const isOwnerRole = user.id === clienteIdFromRoute;

            setIsUserAdmin(isAdminRole);
            setIsUserOwner(isOwnerRole);

            let isAgentRole = false;
            if (!isAdminRole && !isOwnerRole) { // Solo buscar si es agente si no es admin ni owner
                try {
                    const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);
                    if (!controller.signal.aborted && result.success && result.data) {
                        setCurrentAgentInfo(result.data);
                        isAgentRole = true;
                    } else {
                        setCurrentAgentInfo(null);
                    }
                } catch {
                    if (!controller.signal.aborted) setCurrentAgentInfo(null);
                }
            } else {
                setCurrentAgentInfo(null); // No es necesario si es admin/owner para el permiso base
            }
            setIsUserCrmAgent(isAgentRole);

            const hasBasePermission = isAdminRole || isOwnerRole || isAgentRole;

            if (!hasBasePermission && !initialError) {
                setDisplayError("No tienes permiso para enviar mensajes en este chat.");
            }

            setIsLoadingPermissions(false);
        }

        checkPermissions();
        return () => { controller.abort(); };
    }, [user, negocioId, params?.clienteId, currentConversationId, initialError, displayError]);

    // EFECTO: Scroll al final
    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (messages.length > 0) setTimeout(scrollToBottom, 150); }, [messages, scrollToBottom]);

    useEffect(() => {
        console.log(`[ChatComponent DebugMsgLoad] useEffect[initialMessages, initialError] disparado. New initialMessages count: ${initialMessages?.length}. Estado actual de messages: ${messages.length}`);
        setMessages(initialMessages || []);
        if (!displayError?.includes("permiso")) {
            setDisplayError(initialError || null);
        }
    }, [initialMessages, initialError, displayError, messages.length]);

    // EFECTO: Realtime
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
                        // Parsear JSONs que vienen de la BD
                        let parsedFRD = null;
                        if (nuevaInteraccionRt.functionResponseData) {
                            try { parsedFRD = typeof nuevaInteraccionRt.functionResponseData === 'string' ? JSON.parse(nuevaInteraccionRt.functionResponseData) : nuevaInteraccionRt.functionResponseData; }
                            catch (e) { console.error("Error parseando FRD de Realtime:", e); parsedFRD = { errorParsing: true, raw: nuevaInteraccionRt.functionResponseData }; }
                        }
                        let parsedFCA = null;
                        if (nuevaInteraccionRt.functionCallArgs) {
                            try { parsedFCA = typeof nuevaInteraccionRt.functionCallArgs === 'string' ? JSON.parse(nuevaInteraccionRt.functionCallArgs) : nuevaInteraccionRt.functionCallArgs; }
                            catch { parsedFCA = { errorParsing: true }; }
                        }

                        const nuevaChatMessageDraft = {
                            id: nuevaInteraccionRt.id, conversacionId: nuevaInteraccionRt.conversacionId, role: nuevaInteraccionRt.role,
                            mensajeTexto: nuevaInteraccionRt.mensajeTexto ?? null,
                            parteTipo: nuevaInteraccionRt.parteTipo ?? InteraccionParteTipo.TEXT,
                            functionCallNombre: nuevaInteraccionRt.functionCallNombre, functionCallArgs: parsedFCA,
                            functionResponseData: parsedFRD, // Usar el objeto parseado
                            mediaUrl: nuevaInteraccionRt.mediaUrl ?? undefined, mediaType: nuevaInteraccionRt.mediaType ?? undefined,
                            createdAt: new Date(nuevaInteraccionRt.createdAt),
                            agenteCrm: nuevaInteraccionRt.agenteCrmId && nuevaInteraccionRt.agenteCrm ? { id: nuevaInteraccionRt.agenteCrm.id, nombre: nuevaInteraccionRt.agenteCrm.nombre || null, userId: null } : null,
                        };
                        const validation = chatMessageItemCrmSchema.safeParse(nuevaChatMessageDraft);
                        if (validation.success) {
                            setMessages(prevMessages => {
                                if (prevMessages.some(msg => msg.id === validation.data.id)) return prevMessages;
                                return [...prevMessages, validation.data];
                            });
                        } else { console.error("[CRM Realtime V4] Error Zod validando mensaje de Realtime:", validation.error.flatten().fieldErrors, "Draft:", nuevaChatMessageDraft); }
                    }
                }
            ).subscribe(/* ... tu lógica de subscribe ... */);
        return () => { if (supabase && channel) supabase.removeChannel(channel).catch(console.error); };
    }, [currentConversationId]);
    // HANDLER: Enviar mensaje

    // HANDLER: Enviar mensaje
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentConversationId) return;

        const hasRolePerm = isUserAdmin || isUserOwner || isUserCrmAgent;
        // Un agente/admin/owner SÍ puede enviar mensajes si el estado es 'hitl_activo' o 'en_espera_agente'.
        // Solo no puede enviar si está 'cerrada'.
        const canSendByConvStatus = conversationDetails?.status !== 'cerrada';

        if (!hasRolePerm) {
            setDisplayError("No tienes los permisos necesarios para enviar mensajes.");
            return;
        }
        if (!canSendByConvStatus) {
            setDisplayError(`La conversación está en estado '${conversationDetails?.status}' y no permite nuevos mensajes de este tipo.`);
            return;
        }

        setIsSending(true); setDisplayError(null);
        const textToSend = newMessage.trim();
        setNewMessage('');
        const result = await enviarMensajeCrmAction({
            conversacionId: currentConversationId, mensaje: textToSend, role: 'agent',
            agenteCrmId: currentAgentInfo?.id || null,
        });
        setIsSending(false);
        if (!result.success) {
            setDisplayError(result.error || 'Error al enviar mensaje.'); setNewMessage(textToSend);
        }
    };

    // HELPERS DE UI
    const getMessageSenderIcon = useCallback((role: ChatMessageItemCrmData['role'], agente?: AgenteBasicoCrmData | null): JSX.Element => {
        const localUser = user;
        const localCurrentAgentInfo = currentAgentInfo;
        let agentDisplayName: string | null = null;
        if (role === 'agent') {
            if (agente?.id && localCurrentAgentInfo?.id && agente.id === localCurrentAgentInfo.id) agentDisplayName = localCurrentAgentInfo.nombre || localUser?.username || "Tú (Agente)";
            else if (agente) agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`;
            else if (isUserOwner || isUserAdmin) agentDisplayName = localUser?.username || (isUserAdmin ? "Admin" : "Propietario");
            else agentDisplayName = "Soporte/Agente";
        }
        const displayName = role === 'user' ? (conversationDetails?.leadNombre || 'Cliente') :
            (role === 'assistant' ? (conversationDetails?.asistenteNombre || 'Asistente IA') : agentDisplayName);
        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;
        if (role === 'agent' && (isUserOwner || isUserAdmin) && (!agente?.id || (agente?.userId === localUser?.id && localUser?.id))) return <span title={displayName || undefined}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        if (role === 'agent') return <span title={displayName || undefined}><User size={18} className="text-purple-300" /></span>;
        return <MessageSquareWarning size={18} className="text-amber-400" />;
    }, [user, currentAgentInfo, conversationDetails, isUserAdmin, isUserOwner]);

    const copiarIdConversacion = useCallback((id: string | undefined) => {
        if (id) {
            navigator.clipboard.writeText(id);
            setMensajeCopiado('ID copiado!');
            setTimeout(() => { setMensajeCopiado(null); }, 2000);
        }
    }, []);
    const getMessageAlignment = useCallback((role: string): string => (role === 'user' ? 'items-end' : (role === 'assistant' || role === 'agent' ? 'items-start' : 'items-center justify-center')), []);
    const getMessageBgColor = useCallback((role: string): string => (role === 'user' ? 'bg-blue-700/80 hover:bg-blue-700 text-blue-50' : (role === 'assistant' ? 'bg-zinc-700/70 hover:bg-zinc-700 text-zinc-100' : (role === 'agent' ? 'bg-purple-700/80 hover:bg-purple-700 text-purple-50' : (role === 'system' ? 'bg-zinc-600/50 text-zinc-300 text-center' : 'bg-zinc-800 text-zinc-100')))), []);

    // RENDERIZADO DEL ÁREA DE CHAT
    let chatAreaContent;
    if (!conversationDetails && !initialError && isLoadingPermissions && messages.length === 0) {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <Loader2 size={32} className="animate-spin" /> <p className="mt-2">Cargando conversación...</p> </div>);
    } else if (!conversationDetails && displayError) {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-red-400"> <MessageSquareWarning size={32} className="mb-2" /> <p className="font-medium">Error:</p> <p className="text-sm">{displayError}</p> </div>);
    } else if (messages.length === 0 && !isLoadingPermissions) {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <MessageSquareWarning size={32} className="mb-2" /> <p>No hay mensajes.</p> </div>);
    } else if (messages.length > 0) {
        chatAreaContent = messages.map((msg) => (
            <ChatMessageBubble
                key={msg.id || `msg-${msg.createdAt?.getTime()}-${Math.random()}`}
                msg={msg}
                conversationDetails={conversationDetails}
                currentAgentInfo={currentAgentInfo}
                isAdmin={isUserAdmin}
                isOwner={isUserOwner}
                getMessageAlignment={getMessageAlignment}
                getMessageBgColor={getMessageBgColor}
                getMessageSenderIcon={getMessageSenderIcon}
                openLightboxWithSlides={openLightboxWithSlides}
            />
        ));
    } else {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <Loader2 size={32} className="animate-spin" /> <p className="mt-2">Cargando...</p> </div>);
    }

    // Cálculo final del permiso de envío
    const hasRolePermission = isUserAdmin || isUserOwner || isUserCrmAgent;
    // Un agente/admin/owner SÍ puede enviar mensajes si el estado es 'hitl_activo' o 'en_espera_agente'.
    // Solo no puede enviar si está 'cerrada'.
    const canSendByConversationStatus = conversationDetails?.status !== 'cerrada';
    const finalCanSendPermission = hasRolePermission && canSendByConversationStatus;

    return (
        <div className="flex flex-col h-full bg-zinc-800" style={{ maxHeight: 'calc(100vh - 110px)' }}>
            <ChatHeader
                conversationDetails={conversationDetails}
                currentConversationId={currentConversationId}
                mensajeCopiado={mensajeCopiado}
                copiarIdConversacion={copiarIdConversacion}
            />
            <div ref={messagesContainerRef} className="flex-1 min-h-0 p-3 md:p-4 space-y-0 overflow-y-auto bg-zinc-900/80 custom-scrollbar">
                {chatAreaContent}
                <div ref={messagesEndRef} />
            </div>
            <ChatInputArea
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                isSending={isSending}
                isLoadingPermissions={isLoadingPermissions}
                canSendPermission={finalCanSendPermission}
                currentConversationId={currentConversationId}
                error={displayError}
            />
            {lightboxOpen && (<Lightbox
                open={true}
                close={() => {
                    // console.log("[ChatComponent UltraFinal V2] Lightbox close() prop.");
                    setLightboxOpen(false);
                }}
                slides={lightboxSlides}
                index={lightboxIndex}
                plugins={[Thumbnails]}
                thumbnails={{}}
                styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" } }}
            />)}
        </div>
    );
}

