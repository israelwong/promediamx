// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatMessageBubble.tsx
'use client';

import React from 'react';
import { JSX } from 'react';
import { InteraccionParteTipo } from '@prisma/client';
import type {
    ChatMessageItemCrmData,
    ConversationDetailsForPanelData,
    MediaItem,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { FunctionResponseMediaDataSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';

import ClientTime from './ClientTime'; // Subcomponente para la hora
import MediaItemDisplay from './MediaItemDisplay'; // Subcomponente para la media

export interface ChatMessageBubbleProps {
    msg: ChatMessageItemCrmData;
    conversationDetails: ConversationDetailsForPanelData | null;
    currentAgentInfo: AgenteBasicoCrmData | null;
    isAdmin: boolean;
    isOwner: boolean;
    getMessageAlignment: (role: string) => string;
    getMessageBgColor: (role: string) => string;
    getMessageSenderIcon: (
        role: ChatMessageItemCrmData['role'],
        agente?: AgenteBasicoCrmData | null
    ) => JSX.Element;
    openLightboxWithSlides: (
        slides: { src: string; alt?: string; type?: "image" }[],
        index: number
    ) => void;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
    msg,
    conversationDetails,
    currentAgentInfo,
    isAdmin,
    isOwner,
    getMessageAlignment,
    getMessageBgColor,
    getMessageSenderIcon,
    openLightboxWithSlides,
}) => {
    let assistantSentMedia: MediaItem[] = [];
    let contentToDisplay = msg.mensajeTexto; // Fallback al mensajeTexto original del objeto msg

    // Procesar functionResponseData para extraer content y media del asistente
    if (msg.role === 'assistant' && msg.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE && msg.functionResponseData) {
        const parsedResponse = FunctionResponseMediaDataSchema.safeParse(msg.functionResponseData);
        if (parsedResponse.success) {
            // Priorizar el 'content' de functionResponseData si existe
            contentToDisplay = parsedResponse.data.content || msg.mensajeTexto; // Usar content, o fallback a mensajeTexto si content es vacío
            if (parsedResponse.data.media && parsedResponse.data.media.length > 0) {
                assistantSentMedia = parsedResponse.data.media;
            }
            // console.log(`[ChatMessageBubble] Msg ID ${msg.id}: functionResponseData procesado. Content: ${contentToDisplay?.substring(0,50)}..., Media: ${assistantSentMedia.length} items.`);
        } else {
            console.warn(`[ChatMessageBubble] Msg ID ${msg.id}: Falla al parsear functionResponseData con Zod:`, parsedResponse.error.flatten().fieldErrors, "Raw data:", msg.functionResponseData);
            // contentToDisplay se queda con msg.mensajeTexto como fallback
            // assistantSentMedia se queda vacío
        }
    }

    const renderContent = () => {
        if (!contentToDisplay && assistantSentMedia.length === 0 && msg.parteTipo !== InteraccionParteTipo.FUNCTION_CALL) {
            // Si no hay texto, ni media del asistente, y no es un FUNCTION_CALL (que puede tener mensajeTexto "Procesando...")
            return <p className="text-sm italic text-zinc-400">[Mensaje sin contenido visible]</p>;
        }
        if (!contentToDisplay && assistantSentMedia.length > 0) {
            // Si hay media pero no hay texto de acompañamiento (contentToDisplay es null/undefined/vacío)
            // No renderizamos nada aquí para el texto, solo la media se mostrará después.
            return null;
        }
        if (!contentToDisplay && msg.parteTipo === InteraccionParteTipo.FUNCTION_CALL) {
            // Si es un FUNCTION_CALL sin mensajeTexto (raro, usualmente tiene "Procesando...")
            return <p className="text-sm italic text-zinc-400">[Llamada a función sin texto]</p>;
        }


        // Determinar si el contentToDisplay debe ser renderizado como HTML
        // 1. Es un FUNCTION_CALL (el mensajeTexto podría ser un placeholder que a veces es HTML)
        // 2. Es una FUNCTION_RESPONSE, el canal original fue 'webchat', Y no hay 'assistantSentMedia' separada (implica que el content es el HTML principal)
        const shouldRenderAsHtml =
            (msg.role === 'assistant' && msg.parteTipo === InteraccionParteTipo.FUNCTION_CALL) ||
            (msg.role === 'assistant' &&
                msg.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE &&
                conversationDetails?.canalOrigen === 'webchat' &&
                assistantSentMedia.length === 0);

        if (shouldRenderAsHtml && contentToDisplay) {
            // Asegurarse que las imágenes dentro de este HTML también puedan activar el lightbox si tienen la clase correcta.
            // El useEffect en ChatComponent principal maneja los 'a.chat-image-lightbox-trigger'.
            return (
                <div
                    className="text-sm prose prose-sm prose-zinc dark:prose-invert max-w-none chat-message-content"
                    dangerouslySetInnerHTML={{ __html: contentToDisplay }}
                />
            );
        }

        if (contentToDisplay) {
            return <p className="text-sm whitespace-pre-wrap chat-message-content">{contentToDisplay}</p>;
        }

        return null; // No hay texto que mostrar
    };

    return (
        <div className={`flex flex-col mb-3 group/message ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'my-2' : ''}`}>
            {msg.role !== 'system' ? (
                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] md:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {(msg.role === 'assistant' || msg.role === 'agent') && (
                        <div className={`flex-shrink-0 self-end p-1.5 rounded-full w-8 h-8 flex items-center justify-center shadow-md ${msg.role === 'agent' ? (msg.agenteCrm?.id === currentAgentInfo?.id && (isAdmin || isOwner) ? 'bg-emerald-600' : 'bg-purple-600') : 'bg-zinc-600'}`}>
                            {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                        </div>
                    )}
                    <div className={`p-3 rounded-xl shadow-md ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                        {/* Sender Name */}
                        {(msg.role === 'agent' && msg.agenteCrm?.nombre && !(currentAgentInfo?.id === msg.agenteCrm.id && (isAdmin || isOwner))) && (
                            <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                <span className='text-purple-200'>{msg.agenteCrm.nombre}</span>
                            </div>
                        )}
                        {(msg.role === 'assistant' && conversationDetails?.asistenteNombre) && (
                            <div className="flex items-center gap-1.5 mb-1 text-xs font-medium">
                                <span className='text-zinc-300'>{conversationDetails.asistenteNombre}</span>
                            </div>
                        )}

                        {/* Content (Text or HTML) */}
                        {renderContent()}

                        {/* Media Enviada por Usuario (directamente de msg.mediaUrl) */}
                        {msg.role === 'user' && msg.mediaUrl && msg.mediaType && (
                            <div className="mt-2">
                                <MediaItemDisplay
                                    mediaItem={{
                                        url: msg.mediaUrl,
                                        tipo: msg.mediaType as MediaItem['tipo'], // Cast, asegurar que msg.mediaType sea compatible
                                        caption: (msg.mensajeTexto && msg.mediaUrl) ? msg.mensajeTexto : "Adjunto del usuario",
                                        filename: (msg.mensajeTexto && msg.mediaType === 'document') ? msg.mensajeTexto : undefined,
                                    }}
                                    itemIndex={0} // Solo hay un mediaUrl/mediaType por mensaje de usuario en la estructura actual
                                    messageId={msg.id!}
                                    allMediaForLightbox={[{ url: msg.mediaUrl, tipo: msg.mediaType as MediaItem['tipo'], caption: (msg.mensajeTexto && msg.mediaUrl) ? msg.mensajeTexto : "Adjunto del usuario" }]}
                                    openLightboxWithSlides={openLightboxWithSlides}
                                />
                            </div>
                        )}

                        {/* Media Enviada por Asistente (desde assistantSentMedia procesado de functionResponseData.media) */}
                        {assistantSentMedia.length > 0 && (
                            <div className="mt-2 flex flex-col gap-1">
                                {assistantSentMedia.map((item, idx) => (
                                    <MediaItemDisplay
                                        key={`${msg.id}-asm-${idx}`}
                                        mediaItem={item}
                                        itemIndex={idx}
                                        messageId={msg.id!}
                                        allMediaForLightbox={assistantSentMedia} // Pasa el array completo de media de este mensaje
                                        openLightboxWithSlides={openLightboxWithSlides}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    {msg.role === 'user' && (
                        <div className="flex-shrink-0 self-end text-blue-100 p-1.5 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center shadow-md">
                            {getMessageSenderIcon(msg.role, msg.agenteCrm)}
                        </div>
                    )}
                </div>
            ) : (
                // Mensaje de Sistema
                <div className={`my-2 ${getMessageBgColor(msg.role)} px-3 py-1.5 text-xs rounded-lg shadow-sm max-w-md mx-auto`}>
                    {contentToDisplay || '[Mensaje de sistema vacío]'}
                </div>
            )}
            {/* Timestamp */}
            <span className={`text-[0.65rem] text-zinc-500 mt-0.5 px-1 ${msg.role === 'user' ? 'self-end mr-10 sm:mr-12' : (msg.role === 'system' ? 'self-center' : 'self-start ml-10 sm:ml-12')}`}>
                {msg.createdAt ? <ClientTime date={msg.createdAt} /> : '--:--'}
            </span>
        </div>
    );
}

ChatMessageBubble.displayName = 'ChatMessageBubble';
export default ChatMessageBubble;