// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatComponent.tsx
'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import Cookies from 'js-cookie';
import { useRouter, useParams } from 'next/navigation';
import { JSX } from 'react';

// Lucide Icons
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
    // EnviarMensajeCrmParams,
    ConversationDetailsForPanelData,
    // MediaItem ya se importa en los subcomponentes que lo usan
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { chatMessageItemCrmSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';
import { type UsuarioExtendido, UserTokenPayloadSchema } from '@/app/admin/_lib/actions/usuario/usuario.schemas';
import { InteraccionParteTipo } from '@prisma/client';

// Subcomponentes
import ChatHeader from './ChatHeader';
import ChatInputArea from './ChatInputArea';
import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble'; //!reutilizado
// ClientTime se importa dentro de ChatMessageBubble si solo se usa allí, o aquí si se usa en más lugares.
// Para este ejemplo, asumimos que ChatMessageBubble importa ClientTime.

// Definición de InteraccionRealtimePayload (si no está en un archivo de tipos global)
interface InteraccionRealtimePayload {
    id: string; conversacionId: string; role: string; mensajeTexto: string | null;
    parteTipo?: 'TEXT' | 'FUNCTION_CALL' | 'FUNCTION_RESPONSE' | null;
    functionCallNombre?: string | null; functionCallArgs?: unknown | null;
    functionResponseData?: unknown | null; mediaUrl?: string | null; mediaType?: string | null;
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
        console.warn("[ChatComponent CRM V4] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
    }
}

const ADMIN_ROLE_NAME = 'Administrador'; // Definir constante para el rol

export default function ChatComponent({
    initialConversationDetails,
    initialMessages,
    initialError,
    negocioId,
}: ChatComponentProps) {

    console.log("[ChatComponent CRM V4 - Refactorizado] Props iniciales:", { initialConversationDetailsId: initialConversationDetails?.id, initialMessagesCount: initialMessages?.length });

    const [messages, setMessages] = useState<ChatMessageItemCrmData[]>(initialMessages || []);
    const [conversationDetails, setConversationDetails] = useState<ConversationDetailsForPanelData | null>(initialConversationDetails);
    const [error, setError] = useState<string | null>(initialError || null);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null); // Para el listener de clics del lightbox HTML

    const router = useRouter();
    const params = useParams(); // { clienteId, negocioId, conversacionId }

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

    // EFECTO: Actualizar estado cuando las props iniciales cambian
    useEffect(() => {
        const prevConvId = conversationDetails?.id; // Guardar ID previo para comparación
        console.log(`[ChatComponent V4] Props update. PrevConvId: ${prevConvId}, NewInitialConvId: ${initialConversationDetails?.id}`);
        setConversationDetails(initialConversationDetails);
        setMessages(initialMessages || []);
        setError(initialError || null);

        if (initialConversationDetails?.id !== prevConvId) {
            console.log("[ChatComponent V4] ID de conversación cambió. Reseteando permisos.");
            setIsLoadingPermissions(true);
            setCurrentAgentInfo(null);
            setIsOwner(false);
            setIsAdmin(false);
            if (error && (error.includes("permiso") || error.includes("autorización") || error.includes("autenticado"))) {
                setError(null); // Limpiar errores de permisos viejos
            }
        }
    }, [initialConversationDetails, initialMessages, initialError, conversationDetails?.id, error]); // Añadido conversationDetails?.id y error para cumplir con las dependencias de React.

    // FUNCIÓN PARA ABRIR LIGHTBOX (pasada a los subcomponentes)
    const openLightboxWithSlides = useCallback((slides: { src: string; alt?: string; type?: "image" }[], index: number) => {
        console.log("[ChatComponent V4] Abriendo Lightbox. Slides Count:", slides.length, "Índice:", index);
        // Filtrar por si acaso, aunque MediaItemDisplay ya debería hacerlo
        const imageSlidesOnly = slides.filter(slide => slide.type === 'image' && slide.src);
        if (imageSlidesOnly.length > 0) {
            setLightboxSlides(imageSlidesOnly);
            setLightboxIndex(index >= 0 && index < imageSlidesOnly.length ? index : 0);
            setLightboxOpen(true);
        } else {
            console.warn("[ChatComponent V4] openLightboxWithSlides: No hay slides de imagen válidos para mostrar.");
        }
    }, []);

    // EFECTO: Lightbox para contenido HTML (webchat)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || conversationDetails?.canalOrigen !== 'webchat') return;

        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            let hrefForLightbox: string | null = null;
            let altForLightbox: string | null = null;

            const anchorTrigger = targetElement.closest('a.chat-image-lightbox-trigger');
            const imgTrigger = targetElement.closest('img.chat-image-lightbox-trigger');

            if (anchorTrigger) {
                hrefForLightbox = (anchorTrigger as HTMLAnchorElement).href;
                altForLightbox = (anchorTrigger as HTMLElement).dataset.alt || anchorTrigger.querySelector('img')?.alt || "Imagen Webchat";
            } else if (imgTrigger && imgTrigger.tagName === 'IMG') { // Clic directo en IMG con la clase
                hrefForLightbox = (imgTrigger as HTMLImageElement).src;
                altForLightbox = (imgTrigger as HTMLImageElement).alt || "Imagen Webchat";
            }

            if (hrefForLightbox && conversationDetails?.canalOrigen === 'webchat') { // conversationDetails para CRM, o siempre true para ChatTestPanel
                event.preventDefault();
                console.log("[ChatComponent/TestPanel] Click en trigger de lightbox HTML. URL:", hrefForLightbox);

                // Lógica para encontrar todos los slides en el mensaje actual
                const messageContentElement = targetElement.closest('.chat-message-content'); // Asume que este div envuelve el contenido del mensaje
                let slides: { src: string; alt?: string; type?: "image" }[] = [];
                let clickedImageIndex = -1;

                if (messageContentElement) {
                    // Buscar todas las imágenes o anclas que son triggers dentro de este mensaje
                    const allTriggers = Array.from(
                        messageContentElement.querySelectorAll('img.chat-image-lightbox-trigger, a.chat-image-lightbox-trigger')
                    );

                    slides = allTriggers.map(trigger => {
                        if (trigger.tagName === 'A') return { src: (trigger as HTMLAnchorElement).href, alt: (trigger as HTMLAnchorElement).dataset.alt || trigger.querySelector('img')?.alt || "Imagen", type: 'image' as const };
                        if (trigger.tagName === 'IMG') return { src: (trigger as HTMLImageElement).src, alt: (trigger as HTMLImageElement).alt || "Imagen", type: 'image' as const };
                        return null;
                    }).filter(Boolean) as { src: string; alt?: string; type?: "image" }[];

                    clickedImageIndex = slides.findIndex(slide => slide.src === hrefForLightbox);
                } else { // Fallback: solo la imagen clickeada
                    slides = [{ src: hrefForLightbox, alt: altForLightbox || "Imagen Webchat", type: 'image' as const }];
                    clickedImageIndex = 0;
                }

                if (slides.length > 0) {
                    openLightboxWithSlides(slides, clickedImageIndex >= 0 ? clickedImageIndex : 0);
                }
            }
        };
        container.addEventListener('click', handleClick);
        return () => { if (container) container.removeEventListener('click', handleClick); };
    }, [messages, conversationDetails?.canalOrigen, openLightboxWithSlides]); // Depende de messages para re-atachar handlers

    // EFECTO: Validar token de usuario
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

    // EFECTO: Verificar permisos del usuario/agente
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

    // EFECTO: Realtime para nuevos mensajes
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

    // HELPERS DE UI (pasados a ChatMessageBubble)
    const getMessageSenderIcon = useCallback((role: ChatMessageItemCrmData['role'], agente?: AgenteBasicoCrmData | null): JSX.Element => {
        const localUser = user; const localCurrentAgentInfo = currentAgentInfo;
        let agentDisplayName: string | null = null;
        if (role === 'agent') { if (agente?.id && localCurrentAgentInfo?.id && agente.id === localCurrentAgentInfo.id) agentDisplayName = localCurrentAgentInfo.nombre || localUser?.username || "Tú (Agente)"; else if (agente) agentDisplayName = agente.nombre || `Agente (${agente.id.substring(0, 4)}...)`; else if (isOwner || isAdmin) agentDisplayName = localUser?.username || (isAdmin ? "Admin" : "Propietario"); else agentDisplayName = "Soporte/Agente"; }
        const displayName = role === 'user' ? (conversationDetails?.leadNombre || 'Cliente') : (role === 'assistant' ? (conversationDetails?.asistenteNombre || 'Asistente IA') : agentDisplayName);
        if (role === 'user') return <span title={displayName || undefined}><User size={18} className="text-blue-300" /></span>;
        if (role === 'assistant') return <span title={displayName || undefined}><Bot size={18} className="text-zinc-400" /></span>;
        if (role === 'agent' && (isOwner || isAdmin) && (!agente?.id || (agente?.userId === localUser?.id && localUser?.id))) return <span title={displayName || undefined}><ShieldCheck size={18} className="text-emerald-400" /></span>;
        if (role === 'agent') return <span title={displayName || undefined}><User size={18} className="text-purple-300" /></span>;
        return <MessageSquareWarning size={18} className="text-amber-400" />;
    }, [user, currentAgentInfo, isAdmin, isOwner, conversationDetails?.leadNombre, conversationDetails?.asistenteNombre]);

    const copiarIdConversacion = useCallback((id: string | undefined) => {
        if (id) {
            navigator.clipboard.writeText(id);
            setMensajeCopiado('ID copiado!');
            setTimeout(() => { setMensajeCopiado(null); }, 2000);
        }
    }, []);

    const getMessageAlignment = useCallback((role: string): string => (role === 'user' ? 'items-end' : (role === 'assistant' || role === 'agent' ? 'items-start' : 'items-center justify-center')), []);
    const getMessageBgColor = useCallback((role: string): string => (role === 'user' ? 'bg-blue-700/80 hover:bg-blue-700 text-blue-50' : (role === 'assistant' ? 'bg-zinc-700/70 hover:bg-zinc-700 text-zinc-100' : (role === 'agent' ? 'bg-purple-700/80 hover:bg-purple-700 text-purple-50' : (role === 'system' ? 'bg-zinc-600/50 text-zinc-300 text-center' : 'bg-zinc-800 text-zinc-100')))), []);

    // Contenido del área de chat
    let chatAreaContent;
    if (!conversationDetails && !initialError && isLoadingPermissions) {
        chatAreaContent = (<div className="flex flex-col items-center justify-center h-full p-4 text-zinc-500"> <Loader2 size={32} className="animate-spin text-zinc-400" /> <p className="mt-2">Cargando conversación...</p> </div>);
    } else if (!conversationDetails && (error || initialError)) {
        chatAreaContent = (<div className="flex flex-col items-center justify-center h-full p-4 text-red-400"> <MessageSquareWarning size={32} className="mb-2" /> <p className="font-medium">Error:</p> <p className="text-sm">{error || initialError}</p> </div>);
    } else if (messages.length === 0 && !isLoadingPermissions) {
        chatAreaContent = (<div className="flex flex-col items-center justify-center h-full text-zinc-500"> <MessageSquareWarning size={32} className="mb-2" /> <p>No hay mensajes.</p> </div>);
    } else if (messages.length > 0) {
        chatAreaContent = messages.map((msg) => (
            <ChatMessageBubble
                key={msg.id || `msg-${Math.random()}`} // Asegurar key única
                msg={msg}
                conversationDetails={conversationDetails}
                currentAgentInfo={currentAgentInfo}
                isAdmin={isAdmin}
                isOwner={isOwner}
                getMessageAlignment={getMessageAlignment}
                getMessageBgColor={getMessageBgColor}
                getMessageSenderIcon={getMessageSenderIcon}
                openLightboxWithSlides={openLightboxWithSlides}
            />
        ));
    } else {
        chatAreaContent = (<div className="flex flex-col items-center justify-center h-full p-4 text-zinc-500"> <Loader2 size={32} className="animate-spin text-zinc-400" /> <p className="mt-2">Cargando mensajes...</p> </div>);
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
                error={error}
            // user={user} // Pasar user si ChatInputArea lo necesita explícitamente
            />
            {lightboxOpen && (<Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={lightboxSlides} // Ya no necesita 'as ...' si openLightboxWithSlides lo setea correctamente
                index={lightboxIndex}
                plugins={[Thumbnails]}
                thumbnails={{}}
                styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" }, thumbnail: { backgroundColor: "#222", borderColor: "#444" } }}
            />)}
        </div>
    );
}