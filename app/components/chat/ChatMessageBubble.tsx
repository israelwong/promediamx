// app/components/chat/ui/ChatMessageBubble.tsx
'use client';

import React from 'react';
import { JSX } from 'react';
import { InteraccionParteTipo } from '@prisma/client';
import type {
    ChatMessageItemCrmData, // Este tipo ya debe incluir uiComponentPayload opcional
    ConversationDetailsForPanelData,
    MediaItem,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { FunctionResponseMediaDataSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import type { AgenteBasicoCrmData } from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas';

// Importar los tipos para el UiComponentPayload
import type {
    UiComponentPayload,
    OfferDisplayPayloadData
} from '@/app/admin/_lib/ui-payloads.types'; // AJUSTA LA RUTA a donde guardaste estos tipos

// Subcomponentes
import ClientTime from './ClientTime';
import MediaItemDisplay from './MediaItemDisplay';
import OfferDisplayComponent from '@/app/components/chat/rich_elements/OfferDisplayComponent'; // Asegúrate que la ruta sea correcta

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
    console.log(msg.canalInteraccion)
    // --- Lógica para determinar el contenido y media ---
    let uiPayloadToRender: UiComponentPayload<OfferDisplayPayloadData> | null = null;
    let fallbackContent: string | null | undefined = msg.mensajeTexto; // Fallback inicial
    let fallbackMedia: MediaItem[] = [];

    if (msg.role === 'assistant' && msg.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE) {
        // 1. Intentar usar uiComponentPayload si existe y es del tipo esperado
        if (msg.uiComponentPayload &&
            typeof msg.uiComponentPayload === 'object' &&
            (msg.uiComponentPayload as UiComponentPayload).componentType === 'OfferDisplay' &&
            (msg.uiComponentPayload as UiComponentPayload<OfferDisplayPayloadData>).data
        ) {
            uiPayloadToRender = msg.uiComponentPayload as UiComponentPayload<OfferDisplayPayloadData>;
            console.log(`[ChatMessageBubble] Msg ID ${msg.id}: Renderizando con uiComponentPayload (OfferDisplay).`);
            // Si hay uiComponentPayload, el 'content' de functionResponseData puede ser un texto introductorio
            // o un fallback si el uiComponent no se pudiera renderizar.
            if (msg.functionResponseData) {
                const parsedFallbackResponse = FunctionResponseMediaDataSchema.safeParse(msg.functionResponseData);
                if (parsedFallbackResponse.success) {
                    fallbackContent = parsedFallbackResponse.data.content || msg.mensajeTexto;
                    // No necesitamos fallbackMedia si uiPayloadToRender se va a usar,
                    // a menos que quieras mostrar ambos, lo cual sería raro.
                }
            }
        } else if (msg.functionResponseData) {
            // 2. Si no hay uiComponentPayload válido, usar functionResponseData para content y media (lógica anterior)
            const parsedResponse = FunctionResponseMediaDataSchema.safeParse(msg.functionResponseData);
            if (parsedResponse.success) {
                fallbackContent = parsedResponse.data.content || msg.mensajeTexto;
                if (parsedResponse.data.media && parsedResponse.data.media.length > 0) {
                    fallbackMedia = parsedResponse.data.media;
                }
                // console.log(`[ChatMessageBubble] Msg ID ${msg.id}: Usando fallback functionResponseData. Content: ${fallbackContent?.substring(0,50)}..., Media: ${fallbackMedia.length} items.`);
            } else {
                console.warn(`[ChatMessageBubble] Msg ID ${msg.id}: Falla al parsear functionResponseData con Zod (fallback):`, parsedResponse.error.flatten().fieldErrors);
                // fallbackContent se queda con msg.mensajeTexto
            }
        }
    }
    // Para otros roles o parteTipos, contentToDisplay es simplemente msg.mensajeTexto
    // y no habrá assistantSentMedia (fallbackMedia).

    const renderMessageBody = () => {
        if (uiPayloadToRender) {
            // Renderizar el componente rico
            return <OfferDisplayComponent
                data={uiPayloadToRender.data}
                openLightboxWithSlides={openLightboxWithSlides}
            />;
        }

        // Si no hay uiComponentPayload, usar la lógica de fallback (content y media)
        const shouldRenderHtml =
            (msg.role === 'assistant' && msg.parteTipo === InteraccionParteTipo.FUNCTION_CALL) ||
            (msg.role === 'assistant' &&
                msg.parteTipo === InteraccionParteTipo.FUNCTION_RESPONSE &&
                conversationDetails?.canalOrigen === 'webchat' &&
                fallbackMedia.length === 0); // Si es webchat y NO hay media separada, el content es HTML

        const textContentElement = fallbackContent ? (
            shouldRenderHtml ? (
                <div
                    className="text-sm prose prose-sm prose-zinc dark:prose-invert max-w-none chat-message-content"
                    dangerouslySetInnerHTML={{ __html: fallbackContent }}
                />
            ) : (
                <p className="text-sm whitespace-pre-wrap chat-message-content">{fallbackContent}</p>
            )
        ) : (
            // No mostrar "[Mensaje sin texto principal]" si es una FUNCTION_RESPONSE y SÍ tiene fallbackMedia
            (msg.role !== 'assistant' || msg.parteTipo !== InteraccionParteTipo.FUNCTION_RESPONSE || fallbackMedia.length === 0) &&
            !uiPayloadToRender && // Solo si no estamos renderizando un uiPayload que podría ser autosuficiente
            <p className="text-sm italic text-zinc-400">[Mensaje sin contenido de texto]</p>
        );

        const mediaElement = fallbackMedia.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
                {fallbackMedia.map((item, idx) => (
                    <MediaItemDisplay
                        key={`${msg.id}-fm-${idx}`}
                        mediaItem={item}
                        itemIndex={idx}
                        messageId={msg.id!}
                        allMediaForLightbox={fallbackMedia}
                        openLightboxWithSlides={openLightboxWithSlides}
                    />
                ))}
            </div>
        ) : null;

        if (!textContentElement && !mediaElement && !uiPayloadToRender && msg.parteTipo !== InteraccionParteTipo.FUNCTION_CALL) {
            return <p className="text-sm italic text-zinc-400">[Mensaje sin contenido visible]</p>;
        }

        return (
            <>
                {textContentElement}
                {mediaElement}
            </>
        );
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
                            <div className="flex items-center gap-1.5 mb-1 text-xs font-medium"> <span className='text-purple-200'>{msg.agenteCrm.nombre}</span> </div>
                        )}
                        {(msg.role === 'assistant' && conversationDetails?.asistenteNombre) && (
                            <div className="flex items-center gap-1.5 mb-1 text-xs font-medium"> <span className='text-zinc-300'>{conversationDetails.asistenteNombre}</span> </div>
                        )}

                        {/* Cuerpo del Mensaje (UI Rica o Fallback) */}
                        {renderMessageBody()}

                        {/* Media Enviada por Usuario (si la estructura de msg lo soporta directamente) */}
                        {msg.role === 'user' && msg.mediaUrl && msg.mediaType && (
                            <div className="mt-2">
                                <MediaItemDisplay
                                    mediaItem={{
                                        url: msg.mediaUrl,
                                        tipo: msg.mediaType as MediaItem['tipo'],
                                        caption: (msg.mensajeTexto && msg.mediaUrl) ? msg.mensajeTexto : "Adjunto del usuario",
                                        filename: (msg.mensajeTexto && msg.mediaType === 'document') ? msg.mensajeTexto : undefined,
                                    }}
                                    itemIndex={0}
                                    messageId={msg.id!}
                                    allMediaForLightbox={[{ url: msg.mediaUrl, tipo: msg.mediaType as MediaItem['tipo'], caption: (msg.mensajeTexto && msg.mediaUrl) ? msg.mensajeTexto : "Adjunto del usuario" }]}
                                    openLightboxWithSlides={openLightboxWithSlides}
                                />
                            </div>
                        )}
                    </div>
                    {msg.role === 'user' && (<div className="flex-shrink-0 self-end text-blue-100 p-1.5 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center shadow-md"> {getMessageSenderIcon(msg.role, msg.agenteCrm)} </div>)}
                </div>
            ) : (
                // Mensaje de Sistema
                <div className={`my-2 ${getMessageBgColor(msg.role)} px-3 py-1.5 text-xs rounded-lg shadow-sm max-w-md mx-auto`}>
                    {fallbackContent || msg.mensajeTexto || '[Mensaje de sistema vacío]'}
                </div>
            )}
            {/* Timestamp */}
            <span className={`text-[0.65rem] text-zinc-500 mt-0.5 px-1 ${msg.role === 'user' ? 'self-end mr-10 sm:mr-12' : (msg.role === 'system' ? 'self-center' : 'self-start ml-10 sm:ml-12')}`}>
                {msg.createdAt ? <ClientTime date={msg.createdAt} /> : '--:--'}
            </span>
        </div>
    );
};

ChatMessageBubble.displayName = 'ChatMessageBubble';
export default ChatMessageBubble;