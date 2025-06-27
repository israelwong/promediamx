// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback, JSX } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, MessageSquareWarning, User, Bot, ShieldCheck } from 'lucide-react'; // Añadido Volume2

// Lightbox
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // Asegúrate que esté instalado
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

// Actions
import { enviarMensajeCrmAction } from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import { obtenerAgenteCrmPorUsuarioAction } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions';
import { verifyToken } from '@/app/lib/auth';

// Schemas y Tipos
import type {
    ChatMessageItemCrmData,
    // EnviarMensajeCrmParams, // Necesario para handleSendMessage
    ConversationDetailsForPanelData,
    // MediaItem se usa en ChatMessageBubble y sus hijos
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { chatMessageItemCrmSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';
import { type UsuarioExtendido, UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';
import { InteraccionParteTipo } from '@prisma/client';

// Subcomponentes (Asegúrate que las rutas sean correctas)
import ChatHeader from './ChatHeader'; // Asumiendo que está en el mismo directorio
import ChatInputArea from './ChatInputArea'; // Asumiendo que está en el mismo directorio
import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble'; // Desde la carpeta compartida

// Definición de InteraccionRealtimePayload
interface InteraccionRealtimePayload {
    id: string; conversacionId: string; role: string; mensajeTexto: string | null;
    parteTipo?: 'TEXT' | 'FUNCTION_CALL' | 'FUNCTION_RESPONSE' | null;
    functionCallNombre?: string | null; functionCallArgs?: unknown | null;
    functionResponseData?: unknown | null; uiComponentPayload?: unknown | null; // Añadir uiComponentPayload
    mediaUrl?: string | null; mediaType?: string | null;
    createdAt: string; agenteCrmId?: string | null;
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
        console.warn("[ChatComponent CRM V5] Supabase URL o Anon Key no definidas.");
    }
}

const ADMIN_ROLE_NAME = 'Administrador';

export default function ChatComponent({
    initialConversationDetails,
    initialMessages,
    initialError,
    negocioId,
}: ChatComponentProps) {

    console.log(`[ChatComponent CRM V5] Props iniciales. ConvID: ${initialConversationDetails?.id}, Msgs: ${initialMessages?.length}`);

    const [messages, setMessages] = useState<ChatMessageItemCrmData[]>(initialMessages || []);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(initialConversationDetails);
    const [error, setError] = useState<string | null>(initialError || null);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const params = useParams();

    const [user, setUser] = useState<UsuarioExtendido | null>(null);
    const [currentAgentInfo, setCurrentAgentInfo] = useState<AgenteBasicoCrmData | null>(null);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const currentConversationId = conversationDetails?.id;

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string; type?: "image" }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);

    //! EFECTO: Validar token de usuario
    useEffect(() => {
        async function validarToken() {
            const currentToken = Cookies.get('token');
            if (currentToken) {
                try {
                    const response = await verifyToken(currentToken);
                    const parsedPayload = UserTokenPayloadSchema.safeParse(response.payload);
                    if (parsedPayload.success) {
                        const tokenData = parsedPayload.data;
                        setUser({ id: tokenData.id, username: tokenData.username, email: tokenData.email, rolNombre: tokenData.rol, token: currentToken });
                    } else { Cookies.remove('token'); router.push('/login'); }
                } catch { Cookies.remove('token'); router.push('/login'); }
            } else { router.push('/login'); }
        }
        validarToken();
    }, [router]);

    // EFECTO: Actualizar estado con props cambiantes
    useEffect(() => {
        const prevConvId = conversationDetails?.id;
        setConversationDetails(initialConversationDetails);
        setMessages(initialMessages || []);
        setError(initialError || null);
        if (initialConversationDetails?.id !== prevConvId) {
            setIsLoadingPermissions(true); setCurrentAgentInfo(null); setIsOwner(false); setIsAdmin(false);
            if (error && (error.includes("permiso") || error.includes("autorización"))) setError(null);
        }
    }, [initialConversationDetails, initialMessages, initialError, conversationDetails?.id, error]);

    // FUNCIÓN PARA ABRIR LIGHTBOX
    const openLightboxWithSlides = useCallback((slides: { src: string; alt?: string; type?: "image" }[], index: number, caller?: string) => {
        console.log(`[ChatComponent V5 - openLightbox] Caller: ${caller || 'Unknown'}, Slides: ${slides.length}, Index: ${index}`);
        const imageSlidesOnly = slides.filter(slide => slide.type === 'image' && slide.src);
        if (imageSlidesOnly.length > 0) {
            setLightboxSlides(imageSlidesOnly);
            const validIndex = index >= 0 && index < imageSlidesOnly.length ? index : 0;
            setLightboxIndex(validIndex);
            setLightboxOpen(true); // Abrir explícitamente
        } else {
            console.warn("[ChatComponent V5 - openLightbox] No hay slides de imagen válidos.");
        }
    }, []);

    // EFECTO PARA MONITOREAR LIGHTBOXOPEN (PARA DEBUG)
    useEffect(() => {
        console.log('[ChatComponent V5 - Lightbox STATE] lightboxOpen AHORA ES:', lightboxOpen);
        // if (lightboxOpen) { debugger; } // Descomenta para usar el debugger del navegador
    }, [lightboxOpen]);

    // EFECTO: Lightbox para contenido HTML (webchat)
    // Este listener es para el contenido que se renderiza con dangerouslySetInnerHTML
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
                    openLightboxWithSlides(slides, clickedImageIndex >= 0 ? clickedImageIndex : 0, 'HTML_USE_EFFECT_CLICK');
                }
            }
        };
        // console.log("[ChatComponent V5] Adjuntando listener de click para Lightbox HTML.");
        container.addEventListener('click', handleClick);
        return () => { if (container) { /* console.log("[ChatComponent V5] Removiendo listener de click Lightbox HTML."); */ container.removeEventListener('click', handleClick); } };
    }, [messages, conversationDetails?.canalOrigen, openLightboxWithSlides]);


    // EFECTO: Permisos
    useEffect(() => {
        const clienteIdFromRoute = params?.clienteId as string | undefined; // clienteId del dueño del negocio
        const controller = new AbortController();

        async function checkPermissions() {
            if (!user?.id || !negocioId || !clienteIdFromRoute || !currentConversationId) {
                setIsLoadingPermissions(false); return;
            }
            setIsLoadingPermissions(true);
            let canSendPerm = false;
            if (user.rolNombre === ADMIN_ROLE_NAME) { setIsAdmin(true); canSendPerm = true; }
            if (user.id === clienteIdFromRoute) { setIsOwner(true); canSendPerm = true; }

            try {
                const result = await obtenerAgenteCrmPorUsuarioAction(user.id, negocioId);
                if (controller.signal.aborted) return;
                if (result.success && result.data) { setCurrentAgentInfo(result.data); canSendPerm = true; }
            } catch (e) { if (controller.signal.aborted) return; console.error("Error checkPermissions:", e); }

            if (!canSendPerm) setError("No tienes permiso para enviar mensajes en este chat.");
            else setError(null); // Limpiar error de permisos si ahora sí tiene
            setIsLoadingPermissions(false);
        }

        if (user && currentConversationId) { checkPermissions(); }
        else { setIsLoadingPermissions(false); }
        return () => { controller.abort(); };
    }, [user, negocioId, params?.clienteId, currentConversationId]);

    // EFECTO: Scroll al final
    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (messages.length > 0) { setTimeout(scrollToBottom, 100); } }, [messages, scrollToBottom]); // Pequeño delay


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

    // HELPERS DE UI
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentConversationId) return;
        const canSend = !!(currentAgentInfo?.id || isOwner || isAdmin);
        if (!canSend) { setError("No tienes permiso para enviar mensajes."); return; }
        setIsSending(true); setError(null);
        const textToSend = newMessage.trim();
        setNewMessage('');
        const result = await enviarMensajeCrmAction({
            conversacionId: currentConversationId, mensaje: textToSend, role: 'agent',
            agenteCrmId: currentAgentInfo?.id || null, // Si es owner/admin y no agente, será null
        });
        setIsSending(false);
        if (!result.success) {
            setError(result.error || 'Error al enviar mensaje.'); setNewMessage(textToSend);
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
            else if (isOwner || isAdmin) agentDisplayName = localUser?.username || (isAdmin ? "Admin" : "Propietario");
            else agentDisplayName = "Soporte/Agente";
        }
        const displayName = role === 'user' ? (conversationDetails?.leadNombre || 'Cliente') :
            (role === 'assistant' ? (conversationDetails?.asistenteNombre || 'Asistente IA') : agentDisplayName);
        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;
        if (role === 'agent' && (isOwner || isAdmin) && (!agente?.id || (agente?.userId === localUser?.id && localUser?.id))) return <span title={displayName || undefined}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        if (role === 'agent') return <span title={displayName || undefined}><User size={18} className="text-purple-300" /></span>;
        return <MessageSquareWarning size={18} className="text-amber-400" />;
    }, [user, currentAgentInfo, conversationDetails, isAdmin, isOwner]);


    const copiarIdConversacion = useCallback((id: string | undefined) => {
        if (id) {
            navigator.clipboard.writeText(id);
            setMensajeCopiado('ID copiado!');
            setTimeout(() => { setMensajeCopiado(null); }, 2000);
        }
    }, []);

    const getMessageAlignment = useCallback((role: string): string => (role === 'user' ? 'items-end' : (role === 'assistant' || role === 'agent' ? 'items-start' : 'items-center justify-center')), []);
    const getMessageBgColor = useCallback((role: string): string => (role === 'user' ? 'bg-blue-700/80 hover:bg-blue-700 text-blue-50' : (role === 'assistant' ? 'bg-zinc-700/70 hover:bg-zinc-700 text-zinc-100' : (role === 'agent' ? 'bg-purple-700/80 hover:bg-purple-700 text-purple-50' : (role === 'system' ? 'bg-zinc-600/50 text-zinc-300 text-center' : 'bg-zinc-800 text-zinc-100')))), []);


    // Handler para acciones UI desde ChatMessageBubble
    const handleUiActionTrigger = useCallback((action: unknown) => {
        // Aquí puedes manejar la acción según tu lógica de negocio
        console.log("[ChatComponent] UI Action Triggered:", action);
        // Por ejemplo, podrías hacer dispatch, abrir modales, etc.
    }, []);

    // RENDERIZADO DEL ÁREA DE CHAT
    let chatAreaContent;
    if (!conversationDetails && !initialError && isLoadingPermissions) {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <Loader2 size={32} className="animate-spin" /> <p className="mt-2">Cargando conversación...</p> </div>);
    } else if (!conversationDetails && (error || initialError)) {
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-red-400"> <MessageSquareWarning size={32} className="mb-2" /> <p className="font-medium">Error:</p> <p className="text-sm">{error || initialError}</p> </div>);
    } else if (messages.length === 0 && !isLoadingPermissions) { // Solo mostrar "no hay mensajes" si no se está cargando nada más
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <MessageSquareWarning size={32} className="mb-2" /> <p>No hay mensajes.</p> </div>);
    } else if (messages.length > 0) {
        chatAreaContent = messages.map((msg) => {
            if (msg.role === 'assistant' && msg.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE) {
                const payloadString = (msg.uiComponentPayload === undefined || msg.uiComponentPayload === null)
                    ? String(msg.uiComponentPayload) // Convierte undefined a "undefined" y null a "null"
                    : JSON.stringify(msg.uiComponentPayload, null, 2);
                const displayPayload = payloadString.length > 300 ? payloadString.substring(0, 300) + "..." : payloadString;
                console.log(`[ChatComponent Map] Msg ID ${msg.id}. uiComponentPayload:`, displayPayload);
            }
            return (
                <ChatMessageBubble
                    key={msg.id || `msg-${msg.createdAt?.toString()}-${Math.random()}`}
                    msg={msg}
                    conversationDetails={conversationDetails} // Pasar el real del CRM
                    currentAgentInfo={currentAgentInfo}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                    getMessageAlignment={getMessageAlignment}
                    getMessageBgColor={getMessageBgColor}
                    getMessageSenderIcon={getMessageSenderIcon}
                    openLightboxWithSlides={openLightboxWithSlides} // Pasar la función
                    onUiActionTrigger={handleUiActionTrigger} // <-- Añadido para cumplir con la prop requerida
                />
            );
        });
    } else { // Aún cargando mensajes o permisos, pero hay 'conversationDetails'
        chatAreaContent = (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"> <Loader2 size={32} className="animate-spin" /> <p className="mt-2">Cargando mensajes...</p> </div>);
    }

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
                canSendPermission={!!(currentAgentInfo?.id || isOwner || isAdmin)}
                currentConversationId={currentConversationId}
                error={error} // Pasar el error general del chat
            />
            {lightboxOpen && (
                <Lightbox
                    open={true} // Si ya está condicionado por lightboxOpen, esto es redundante
                    close={() => {
                        console.log("[ChatComponent V5] Lightbox close() prop llamada.");
                        setLightboxOpen(false);
                    }}
                    slides={lightboxSlides}
                    index={lightboxIndex}
                    plugins={[Thumbnails]}
                    thumbnails={{}}
                    styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" } }}
                />
            )}
        </div>
    );
}