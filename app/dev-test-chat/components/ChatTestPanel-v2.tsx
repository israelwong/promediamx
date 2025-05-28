// app/dev-test-chat/components/ChatTestPanel.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquareWarning, CheckCircle2, User, Bot, Trash2 } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
// import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // Descomenta si lo usas
// import "yet-another-react-lightbox/plugins/thumbnails.css";


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
    IniciarConversacionWebchatInputSchema, // Para validación (opcional en cliente)
    EnviarMensajeWebchatInputSchema,     // Para validación (opcional en cliente)
} from '@/app/admin/_lib/actions/webchat_test/chatTest.schemas';
import type { ActionResult } from '@/app/admin/_lib/types';
import { type ChatMessageItem } from '@/app/admin/_lib/schemas/sharedCommon.schemas';

// Subcomponente de Mensajes (Reutilizado)
import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble';
// MediaItemDisplay y ClientTime son usados internamente por ChatMessageBubble

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
        console.warn("[ChatTestPanel V2] Supabase URL o Anon Key no definidas.");
    }
}

export default function ChatTestPanel() {
    const [asistenteId, setAsistenteId] = useState('');
    const [currentConversationId, setCurrentConversationId] = useState('');
    const [inputConversationId, setInputConversationId] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({}); // Simplificado
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [remitenteIdWeb, setRemitenteIdWeb] = useState<string>('');

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string; type?: "image" }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Inicializar remitenteIdWeb desde localStorage o generar uno nuevo
    useEffect(() => {
        let storedRemitenteId = localStorage.getItem('chatTestPanel_remitenteIdWeb');
        if (!storedRemitenteId) {
            storedRemitenteId = uuidv4();
            localStorage.setItem('chatTestPanel_remitenteIdWeb', storedRemitenteId);
        }
        setRemitenteIdWeb(storedRemitenteId);
    }, []);

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(() => { if (chatMessages.length > 0) setTimeout(scrollToBottom, 100); }, [chatMessages, scrollToBottom]);

    // Función para abrir el Lightbox (pasada a ChatMessageBubble)
    const openLightboxWithSlides = useCallback((slides: { src: string; alt?: string; type?: "image" }[], index: number) => {
        console.log("[ChatTestPanel V2] Abriendo Lightbox. Slides:", slides, "Índice:", index);
        const imageSlidesOnly = slides.filter(slide => slide.type === 'image' && slide.src);
        if (imageSlidesOnly.length > 0) {
            setLightboxSlides(imageSlidesOnly);
            setLightboxIndex(index >= 0 && index < imageSlidesOnly.length ? index : 0);
            setLightboxOpen(true);
        }
    }, []);

    // useEffect para el lightbox en contenido HTML (si aplica para ChatTestPanel)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        // Lógica de click para lightbox en HTML (similar a ChatComponent, pero canalOrigen siempre es 'webchat')
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

            if (hrefForLightbox) { // siempre true para ChatTestPanel
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
    }, [chatMessages, openLightboxWithSlides]); // Depende de chatMessages para re-atachar


    const fetchAndSetMessages = useCallback(async (convId: string) => {
        if (!convId) { setChatMessages([]); return; }
        setIsLoadingMessages(true); setError(null);
        const result = await obtenerUltimosMensajesAction(convId, 50);
        if (result.success && result.data) {
            setChatMessages(result.data);
        } else {
            setError(result.error || 'Error al cargar mensajes.'); setChatMessages([]);
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
        // ... (tu lógica existente, se ve bien)
        if (!inputConversationId.trim()) { setError("Ingresa un ID de conversación."); return; }
        setError(null); setSuccessMessage(null); setValidationErrors({});
        setChatMessages([]);
        const newConvId = inputConversationId.trim();
        setCurrentConversationId(newConvId);
        fetchAndSetMessages(newConvId);
    }, [inputConversationId, fetchAndSetMessages]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        // ... (tu lógica existente para validación y envío de 'iniciar' o 'enviar' mensaje)
        // ... la parte optimista se mantiene, la llamada a la acción también.
        // ... el manejo del resultado para actualizar currentConversationId o mostrar error también.
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
            setValidationErrors(clientValidation.error.flatten().fieldErrors);
            setError("Por favor, corrige los errores."); return;
        }
        setIsSending(true);
        const tempUserMessageId = `optimistic-${uuidv4()}`;
        const optimisticMessage: ChatMessageItem = { // Asegúrate que este tipo coincida
            id: tempUserMessageId, conversacionId: currentConversationId || "temp_conv_id", role: 'user',
            mensajeTexto: currentMessageText, createdAt: new Date(), parteTipo: 'TEXT',
        };
        setChatMessages(prev => [...prev, optimisticMessage]);
        setMensaje('');
        try {
            let result: ActionResult<IniciarConversacionWebchatOutput | EnviarMensajeWebchatOutput>;
            if (currentConversationId) result = await enviarMensajeWebchatAction(clientValidation.data as EnviarMensajeWebchatInput);
            else result = await iniciarConversacionWebchatAction(clientValidation.data as IniciarConversacionWebchatInput);

            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
            if (result.success && result.data) {
                const dataFromResult = result.data;
                if ('conversationId' in dataFromResult && dataFromResult.conversationId && dataFromResult.conversationId !== currentConversationId) {
                    setCurrentConversationId(dataFromResult.conversationId); setInputConversationId(dataFromResult.conversationId);
                    setSuccessMessage(`Conversación iniciada: ${dataFromResult.conversationId}. Mensajes pueden tardar en cargar por Realtime o recarga manual.`);
                    // fetchAndSetMessages(dataFromResult.conversationId); // Opcional: forzar carga inmediata
                } else setSuccessMessage(`Mensaje enviado.`);
                // Los mensajes del asistente/función deberían llegar vía Realtime o al re-cargar.
            } else { setError(result.error || 'Error en la acción.'); setMensaje(currentMessageText); }
        } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error inesperado."); setMensaje(currentMessageText); setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId)); }
        finally { setIsSending(false); }
    };

    const handleKeyDownSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (event.currentTarget.form) { const form = event.currentTarget.form; const submitEvent = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(submitEvent); } } };
    const handleResetConversation = () => { setAsistenteId(''); setCurrentConversationId(''); setInputConversationId(''); setChatMessages([]); setError(null); setSuccessMessage("Panel reiniciado."); };

    // --- Funciones Helper para ChatMessageBubble (versión simplificada para TestPanel) ---
    const getTestPanelMessageAlignment = useCallback((role: string): string => {
        return role === 'user' ? 'items-end' : 'items-start';
    }, []);

    const getTestPanelMessageBgColor = useCallback((role: string): string => {
        if (role === 'user') return 'bg-sky-700/80 hover:bg-sky-700 text-sky-50';
        if (role === 'assistant') return 'bg-slate-700/70 hover:bg-slate-700 text-slate-100';
        if (role === 'system') return 'bg-transparent text-slate-500 italic text-xs text-center w-full';
        return 'bg-gray-500 text-white';
    }, []);

    const getTestPanelMessageSenderIcon = useCallback((role: ChatMessageItem['role']) => {
        // El 'nombreRemitente' se podría usar en el title si viene en ChatMessageItem
        if (role === 'user') return <span title="Usuario Test"><User size={18} className="text-sky-300" /></span>;
        if (role === 'assistant') return <span title="Asistente de Prueba"><Bot size={18} className="text-slate-400" /></span>;
        return <span title="Sistema"><MessageSquareWarning size={18} className="text-amber-400" /></span>;
    }, []);


    return (
        <div className="p-4 md:p-6 bg-zinc-800 rounded-xl shadow-2xl border border-zinc-700 max-w-3xl mx-auto my-8">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Panel de Pruebas de Web Chat</h2>
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ... (inputs de asistenteId e inputConversationId como los tenías) ... */}
                    <div>
                        <label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">ID Asistente (nueva conv):</label>
                        <input type="text" id="asistenteId" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} placeholder="ID Asistente Virtual" className="w-full p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" disabled={!!currentConversationId} />
                    </div>
                    <div>
                        <label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">ID Conversación (continuar):</label>
                        <div className="flex gap-2">
                            <input type="text" id="inputConversationId" value={inputConversationId} onChange={(e) => setInputConversationId(e.target.value)} placeholder="Pega ID existente" className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" />
                            <button type="button" onClick={handleLoadConversation} className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" disabled={!inputConversationId.trim() || (isLoadingMessages && currentConversationId === inputConversationId.trim())}>
                                {isLoadingMessages && currentConversationId === inputConversationId.trim() ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}
                            </button>
                        </div>
                    </div>
                </div>
                <button type="button" onClick={handleResetConversation} className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500">
                    <Trash2 size={16} /> Reiniciar Panel
                </button>

                <div ref={messagesContainerRef} className="h-96 bg-zinc-950 p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-1 custom-scrollbar">
                    {(isLoadingMessages && chatMessages.length === 0) && (
                        <div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-2 text-zinc-500">Cargando mensajes...</p></div>
                    )}
                    {(!isLoadingMessages && chatMessages.length === 0) && (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500"><MessageSquareWarning size={40} className="mb-2" /><p>{currentConversationId ? `No hay mensajes para ${currentConversationId}.` : "Inicia o carga una conversación."}</p></div>
                    )}

                    {/* --- NUEVO RENDERIZADO USANDO ChatMessageBubble --- */}
                    {chatMessages.map((msg) => (
                        <ChatMessageBubble
                            key={msg.id || `msg-${Date.now()}-${Math.random()}`}
                            msg={msg}
                            conversationDetails={{ // Objeto simulado para ChatTestPanel
                                id: currentConversationId || msg.conversacionId || "test-conv",
                                status: 'abierta',
                                leadId: null,
                                leadNombre: msg.role === 'user' ? (msg.nombreRemitente || 'Usuario Test') : null, // Usar nombreRemitente si está
                                agenteCrmActual: null,
                                canalOrigen: 'webchat',
                                canalIcono: 'webchat',
                                asistenteNombre: 'Asistente de Prueba',
                            }}
                            currentAgentInfo={null}
                            isAdmin={false}
                            isOwner={false}
                            getMessageAlignment={getTestPanelMessageAlignment}
                            getMessageBgColor={getTestPanelMessageBgColor}
                            getMessageSenderIcon={getTestPanelMessageSenderIcon}
                            openLightboxWithSlides={openLightboxWithSlides}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-3 pt-3 border-t border-zinc-700"> {/* sticky bottom-0 py-3 bg-zinc-800 -mx-6 px-6 md:-mx-8 md:px-8 */}
                    <div>
                        <div className="flex items-stretch gap-2"> {/* items-stretch para que textarea y button tengan misma altura */}
                            <textarea id="mensaje" form="chatTestPanelForm" value={mensaje} onKeyDown={handleKeyDownSubmit} onChange={(e) => setMensaje(e.target.value)} placeholder={currentConversationId ? "Escribe tu respuesta..." : "Escribe tu primer mensaje..."} rows={2} className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 resize-none" />
                            <button type="submit" form="chatTestPanelForm" disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 self-stretch" aria-label="Enviar mensaje"> {/* self-stretch */}
                                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                    {validationErrors && Object.keys(validationErrors).length > 0 && (
                        <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-xs space-y-1">
                            <p className="font-medium flex items-center gap-1"><MessageSquareWarning size={16} /> Errores de validación:</p>
                            <ul className="list-disc list-inside pl-1">
                                {Object.entries(validationErrors).map(([field, errors]) =>
                                    Array.isArray(errors)
                                        ? errors.map((err, i) => <li key={`${field}-${i}`}>{err}</li>)
                                        : null
                                )}
                            </ul>
                        </div>
                    )}
                    {error && (<div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2"><MessageSquareWarning size={18} /> {error}</div>)}
                    {successMessage && (<div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2"><CheckCircle2 size={18} /> {successMessage}</div>)}
                </form>

                {lightboxOpen && (
                    <Lightbox
                        open={lightboxOpen}
                        close={() => setLightboxOpen(false)}
                        slides={lightboxSlides} // Ya no necesita 'as ...'
                        index={lightboxIndex}
                        // plugins={[Thumbnails]} // Descomenta si importaste Thumbnails
                        // thumbnails={{}}
                        styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" } }}
                    />
                )}
            </div>
        </div>
    );
}