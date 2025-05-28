// app/dev-test-chat/components/ChatTestPanel.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquareWarning, CheckCircle2, User, Bot, Trash2 } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
// import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // Descomenta si necesitas y está instalado

import {
    iniciarConversacionWebchatAction,
    enviarMensajeWebchatAction,
    obtenerUltimosMensajesAction
} from '@/app/admin/_lib/actions/webchat_test/chatTest.actions';
import {
    type IniciarConversacionWebchatInput,
    type IniciarConversacionWebchatOutput,
    type EnviarMensajeWebchatInput,
    type EnviarMensajeWebchatOutput,
    IniciarConversacionWebchatInputSchema,
    EnviarMensajeWebchatInputSchema,
} from '@/app/admin/_lib/actions/webchat_test/chatTest.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import { type ChatMessageItem } from '@/app/admin/_lib/schemas/sharedCommon.schemas';
// Necesitamos el tipo ConversationDetailsForPanelData para simularlo
import type { ConversationDetailsForPanelData } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';


// Subcomponente de Mensajes (Reutilizado)
import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble';
// MediaItemDisplay y ClientTime son usados por ChatMessageBubble y OfferDisplayComponent.
// OfferDisplayComponent es usado por ChatMessageBubble.

interface InteraccionRealtimeSignal {
    new?: { id?: string; conversacionId?: string;[key: string]: unknown };
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[ChatTestPanel V7] Supabase URL o Anon Key no definidas.");
    }
}

export default function ChatTestPanel() {
    const [asistenteId, setAsistenteId] = useState<string>(process.env.NEXT_PUBLIC_TEST_ASSISTANT_ID || 'cma4f5zho0009guj0fnv019t1'); // Asistente ID por defecto
    const [currentConversationId, setCurrentConversationId] = useState<string>('');
    const [inputConversationId, setInputConversationId] = useState<string>('');
    const [mensaje, setMensaje] = useState<string>('');
    const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [remitenteIdWeb, setRemitenteIdWeb] = useState<string>('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string; type?: "image" }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        let storedRemitenteId = localStorage.getItem('chatTestPanel_remitenteIdWeb_v2');
        if (!storedRemitenteId) {
            storedRemitenteId = uuidv4();
            localStorage.setItem('chatTestPanel_remitenteIdWeb_v2', storedRemitenteId);
        }
        setRemitenteIdWeb(storedRemitenteId);
        console.log("[ChatTestPanel V7] Panel inicializado. RemitenteIDWeb:", storedRemitenteId, "AsistenteID por defecto:", asistenteId);
    }, [asistenteId]);

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (chatMessages.length > 0) setTimeout(scrollToBottom, 150); }, [chatMessages, scrollToBottom]);

    const openLightboxWithSlides = useCallback((slides: { src: string; alt?: string; type?: "image" }[], index: number, caller?: string) => {
        console.log(`[ChatTestPanel V7 - openLightboxWithSlides] Caller: ${caller || 'N/A'}, Slides: ${slides.length}, Index: ${index}`);
        const imageSlidesOnly = slides.filter(slide => slide.type === 'image' && slide.src);
        if (imageSlidesOnly.length > 0) {
            setLightboxSlides(imageSlidesOnly);
            const validIndex = index >= 0 && index < imageSlidesOnly.length ? index : 0;
            setLightboxIndex(validIndex);
            setLightboxOpen(true);
        } else {
            console.warn("[ChatTestPanel V7 - openLightboxWithSlides] No hay slides de imagen válidos.");
        }
    }, []);

    useEffect(() => { // Log para el estado del lightbox
        console.log('[ChatTestPanel V7 - Lightbox STATE] lightboxOpen AHORA ES:', lightboxOpen, new Date().toLocaleTimeString());
        // if (lightboxOpen) { debugger; } // Descomenta si se abre inesperadamente
    }, [lightboxOpen]);

    // useEffect para el lightbox en contenido HTML (si es necesario para `dangerouslySetInnerHTML`)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || chatMessages.length === 0) return;

        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            // Solo para anclas con la clase específica dentro de contenido HTML
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
                    openLightboxWithSlides(slides, clickedImageIndex >= 0 ? clickedImageIndex : 0, 'HTML_CONTENT_CLICK');
                }
            }
        };
        container.addEventListener('click', handleClick);
        return () => { if (container) container.removeEventListener('click', handleClick); };
    }, [chatMessages, openLightboxWithSlides]);


    const fetchAndSetMessages = useCallback(async (convId: string) => {
        if (!convId) { setChatMessages([]); return; }
        setIsLoadingMessages(true); setError(null);
        console.log(`[ChatTestPanel V7] Fetching messages for convId: ${convId}`);
        const result = await obtenerUltimosMensajesAction(convId, 50);
        if (result.success && result.data) {
            console.log(`[ChatTestPanel V7] Mensajes RECIBIDOS de Action (${result.data.length}).`);
            // Log para verificar si uiComponentPayload llega en algún mensaje
            result.data.forEach(msg => {
                if (msg.uiComponentPayload) {
                    console.log(`[ChatTestPanel V7] Mensaje ID ${msg.id} TIENE uiComponentPayload:`, JSON.stringify(msg.uiComponentPayload, null, 2).substring(0, 300) + "...");
                }
            });
            setChatMessages(result.data);
        } else {
            setError(result.error || 'Error al cargar mensajes.'); setChatMessages([]);
            console.error(`[ChatTestPanel V7] Error en obtenerUltimosMensajesAction:`, result.error);
        }
        setIsLoadingMessages(false);
    }, []);


    useEffect(() => {
        if (!supabase || !currentConversationId) return;
        const channelName = `interacciones-conv-${currentConversationId}`;
        const channel: RealtimeChannel = supabase
            .channel(channelName)
            .on<InteraccionRealtimeSignal>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Interaccion', filter: `conversacionId=eq.${currentConversationId}` },
                (payload) => {
                    if (payload.new && 'id' in payload.new && payload.new.id) fetchAndSetMessages(currentConversationId);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[ChatTestPanel Realtime] Suscrito a ${channelName}`);
                else if (err) console.error(`[ChatTestPanel Realtime] Error en canal ${channelName}:`, err);
                else console.log(`[ChatTestPanel Realtime] Estado del canal ${channelName}: ${status}`);
            });
        return () => { if (supabase && channel) supabase.removeChannel(channel).catch(console.error); };
    }, [currentConversationId, fetchAndSetMessages]);

    const handleLoadConversation = useCallback(() => {
        if (!inputConversationId.trim()) { setError("Ingresa un ID de conversación."); return; }
        setError(null); setSuccessMessage(null); setValidationErrors({});
        setChatMessages([]);
        const newConvId = inputConversationId.trim();
        setCurrentConversationId(newConvId);
        fetchAndSetMessages(newConvId);
    }, [inputConversationId, fetchAndSetMessages]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null); setSuccessMessage(null); setValidationErrors({});

        const currentMessageText = mensaje.trim();
        if (!currentMessageText) { setError('El mensaje no puede estar vacío.'); return; }

        let actionInput: IniciarConversacionWebchatInput | EnviarMensajeWebchatInput;
        let validationSchema;

        if (currentConversationId) {
            actionInput = { conversationId: currentConversationId, mensaje: currentMessageText, remitenteIdWeb };
            validationSchema = EnviarMensajeWebchatInputSchema;
        } else {
            if (!asistenteId.trim()) { setError('Se requiere un ID de Asistente para iniciar.'); return; }
            actionInput = { asistenteId: asistenteId.trim(), mensajeInicial: currentMessageText, remitenteIdWeb, nombreRemitenteSugerido: `Web User ${remitenteIdWeb.substring(0, 6)}` };
            validationSchema = IniciarConversacionWebchatInputSchema;
        }

        const clientValidation = validationSchema.safeParse(actionInput);
        if (!clientValidation.success) {
            setValidationErrors(clientValidation.error.flatten().fieldErrors as Partial<Record<keyof (EnviarMensajeWebchatInput & IniciarConversacionWebchatInput), string[]>>); // Necesitarás mapear los errores si las claves no coinciden con el form
            setError("Por favor, corrige los errores.");
            return;
        }

        setIsSending(true);
        const tempUserMessageId = `optimistic-${uuidv4()}`;
        const optimisticMessage: ChatMessageItem = {
            id: tempUserMessageId,
            conversacionId: currentConversationId || "temp_conv_id",
            role: 'user',
            mensajeTexto: currentMessageText,
            createdAt: new Date(),
            // Los demás campos son opcionales o no aplican para el mensaje optimista
        };
        setChatMessages(prev => [...prev, optimisticMessage]);
        setMensaje('');

        try {
            let result: ActionResult<IniciarConversacionWebchatOutput | EnviarMensajeWebchatOutput>;
            if (currentConversationId) {
                result = await enviarMensajeWebchatAction(clientValidation.data as EnviarMensajeWebchatInput);
            } else {
                result = await iniciarConversacionWebchatAction(clientValidation.data as IniciarConversacionWebchatInput);
            }

            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId)); // Remover optimista

            if (result.success && result.data) {
                const dataFromResult = result.data;
                if ('conversationId' in dataFromResult && dataFromResult.conversationId !== currentConversationId) { // Nueva conversación iniciada
                    setCurrentConversationId(dataFromResult.conversationId);
                    setInputConversationId(dataFromResult.conversationId);
                    setSuccessMessage(`Conversación iniciada: ${dataFromResult.conversationId}`);
                } else {
                    setSuccessMessage(`Mensaje enviado.`);
                }
            } else {
                setError(result.error || 'Error en la acción.');
                setChatMessages(prev => [...prev.filter(m => m.id !== tempUserMessageId), { ...optimisticMessage, id: `error-${tempUserMessageId}` }]); // Mantener el mensaje pero marcarlo como error o reintentar
                setMensaje(currentMessageText); // Restaurar
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Error inesperado.";
            setError(errorMessage);
            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
            setMensaje(currentMessageText);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDownSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { /* ... tu lógica ... */ if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (event.currentTarget.form) { const form = event.currentTarget.form; const submitEvent = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(submitEvent); } } };
    const handleResetConversation = () => { /* ... tu lógica ... */ setAsistenteId(''); setCurrentConversationId(''); setInputConversationId(''); setChatMessages([]); setError(null); setSuccessMessage("Panel reiniciado."); };

    const getTestPanelMessageAlignment = useCallback((role: string): string => role === 'user' ? 'items-end' : 'items-start', []);
    const getTestPanelMessageBgColor = useCallback((role: string): string => {
        if (role === 'user') return 'bg-sky-600 text-sky-50';
        if (role === 'assistant') return 'bg-slate-600 text-slate-100';
        if (role === 'system') return 'bg-transparent text-slate-500 italic text-xs text-center';
        return 'bg-gray-500 text-white';
    }, []);
    const getTestPanelMessageSenderIcon = useCallback((role: ChatMessageItem['role'], msg?: ChatMessageItem) => {
        const title = role === 'user' ? (msg?.nombreRemitente || 'Tú') : 'Asistente';
        if (role === 'user') return <span title={title}><User size={16} className="text-sky-100" /></span>;
        if (role === 'assistant') return <span title={title}><Bot size={16} className="text-slate-300" /></span>;
        return <span title="Sistema"><MessageSquareWarning size={16} /></span>;
    }, []);

    // Objeto simulado para conversationDetails, específico para ChatTestPanel
    // `ChatMessageBubble` lo espera para determinar el `canalOrigen` y el nombre del asistente.
    const simulatedConversationDetailsForBubble: ConversationDetailsForPanelData = {
        id: currentConversationId || "test-panel-default-conv-id",
        status: 'abierta',
        leadId: null, // El TestPanel no maneja leads directamente
        leadNombre: 'Usuario (Test Panel)',
        agenteCrmActual: null,
        canalOrigen: 'webchat', // Siempre webchat para el test panel
        canalIcono: 'layout-dashboard', // Un icono genérico
        asistenteNombre: asistenteId ? `Asistente (${asistenteId.substring(0, 8)}...)` : 'Asistente de Prueba',
    };

    return (
        <div className="p-4 md:p-6 bg-zinc-900 text-zinc-100 rounded-xl shadow-2xl border border-zinc-700 max-w-3xl mx-auto my-8">
            <h2 className="text-xl font-semibold text-zinc-50 mb-4">Panel de Pruebas Web Chat (V7)</h2>
            <div className="space-y-4">
                {/* --- Tus Controles de AsistenteID, ConversationID, Reset --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">ID Asistente (nueva conv):</label>
                        <input type="text" id="asistenteId" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} placeholder="ID Asistente Virtual" className="w-full p-2.5 rounded-md text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" disabled={!!currentConversationId} />
                    </div>
                    <div>
                        <label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">ID Conversación (continuar):</label>
                        <div className="flex gap-2">
                            <input type="text" id="inputConversationId" value={inputConversationId} onChange={(e) => setInputConversationId(e.target.value)} placeholder="Pega ID existente" className="flex-grow p-2.5 rounded-md text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" />
                            <button type="button" onClick={handleLoadConversation} className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" disabled={!inputConversationId.trim() || (isLoadingMessages && currentConversationId === inputConversationId.trim())}>
                                {isLoadingMessages && currentConversationId === inputConversationId.trim() ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" onClick={handleResetConversation} className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <Trash2 size={16} /> Reiniciar Panel
                </button>

                {/* --- Área de Mensajes --- */}
                <div ref={messagesContainerRef} className="h-96 bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-0.5 custom-scrollbar">
                    {(isLoadingMessages && chatMessages.length === 0) && (
                        <div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-2 text-zinc-500">Cargando mensajes...</p></div>
                    )}
                    {(!isLoadingMessages && chatMessages.length === 0) && (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500"><MessageSquareWarning size={40} className="mb-2" /><p>{currentConversationId ? `No hay mensajes para ${currentConversationId}.` : "Inicia o carga una conversación."}</p></div>
                    )}

                    {chatMessages.map((msg) => {
                        // Log para ver el msg que se pasa a ChatMessageBubble
                        if (msg.role === 'assistant' && msg.parteTipo === 'FUNCTION_RESPONSE') {
                            console.log(`[ChatTestPanel V7] Pasando msg (ID: ${msg.id}) a Bubble. uiPayload:`, JSON.stringify(msg.uiComponentPayload, null, 2).substring(0, 300) + "...");
                        }
                        return (
                            <ChatMessageBubble
                                key={msg.id || `msg-${msg.createdAt?.getTime()}-${Math.random()}`}
                                msg={msg}
                                conversationDetails={simulatedConversationDetailsForBubble}
                                currentAgentInfo={null} isAdmin={false} isOwner={false}
                                getMessageAlignment={getTestPanelMessageAlignment}
                                getMessageBgColor={getTestPanelMessageBgColor}
                                getMessageSenderIcon={(roleArg) => getTestPanelMessageSenderIcon(roleArg, msg)}
                                openLightboxWithSlides={openLightboxWithSlides}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* --- Formulario de Envío --- */}
                <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-3 pt-3 border-t border-zinc-700">
                    <div>
                        <div className="flex items-stretch gap-2">
                            <textarea id="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} onKeyDown={handleKeyDownSubmit} placeholder={currentConversationId ? "Escribe tu respuesta..." : "Escribe tu primer mensaje..."} rows={2} className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 resize-none" />
                            <button type="submit" disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 self-stretch" aria-label="Enviar mensaje">
                                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                    {validationErrors && Object.keys(validationErrors).length > 0 && (
                        <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-xs space-y-1">
                            <p className="font-medium flex items-center gap-1"><MessageSquareWarning size={16} /> Errores de validación:</p>
                            <ul className="list-disc list-inside pl-1">
                                {Object.entries(validationErrors).map(([field, errors]) =>
                                    errors?.map((err, i) => <li key={`${field}-${i}`}>{err}</li>)
                                )}
                            </ul>
                        </div>
                    )}                    {error && (<div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2"><MessageSquareWarning size={18} /> {error}</div>)}
                    {successMessage && (<div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2"><CheckCircle2 size={18} /> {successMessage}</div>)}
                </form>

                {/* --- Lightbox --- */}
                {lightboxOpen && (
                    <Lightbox
                        open={true}
                        close={() => {
                            console.log("[ChatTestPanel V7] Lightbox close() prop llamada.");
                            setLightboxOpen(false);
                        }}
                        slides={lightboxSlides}
                        index={lightboxIndex}
                        // plugins={[Thumbnails]} // Descomenta si está instalado
                        styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" } }}
                    />
                )}
            </div>
        </div>
    );
}